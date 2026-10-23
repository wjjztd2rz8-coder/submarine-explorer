/**
 * Globe mission select (docs/globe.md): a full-screen DOM overlay with its
 * own canvas and a small dedicated Three.js renderer (never the game canvas).
 *
 * - Earth: NASA Blue Marble Next Generation with topography and bathymetry
 *   (public domain; ATTRIBUTION.md), styled ocean-forward in the shader: land
 *   and ice dimmed and desaturated, a cyan hairline graticule, a hairline rim.
 * - Pins: one real `<button>` per landmark in data/landmarks.json, projected
 *   over the canvas every frame, so Tab / Enter / screen readers work without
 *   a custom focus model. Three states (GlobeModel.resolvePinState): mission,
 *   tile (free dive), catalogue (card only). Every pin is drawn exactly at its
 *   projected location; playable pins whose hit areas would overlap merge into
 *   one counted cluster pin (click: zoom in until they separate, or a chooser
 *   at full zoom). Catalogue pins are faint, non-pointer specks.
 * - Controls: drag to orbit (with inertia), wheel to zoom, idle auto-rotate;
 *   arrows orbit, +/- zoom, Tab cycles pins (the camera turns to face the
 *   focused one), Enter selects, Escape (or the toggle key) closes.
 *
 * While open the game is frozen (main.ts treats `isOpen` like the mission
 * briefing) and keydown events are stopped at the window capture phase so the
 * game's Input, the field guide and the briefing never see them. Keyups pass
 * through so no game key is left stuck.
 */

import * as THREE from 'three';
import type { GlobeConfig } from '../core/Config.js';
import type { GameEvents } from '../core/EventBus.js';
import { el } from './dom.js';
import { FocusTrap } from './FocusTrap.js';
import {
  clusterPins,
  distanceToSeparate,
  facesCamera,
  formatDepth,
  latLonToUnit,
  loadGlobeCatalog,
  OrbitState,
  pinAction,
  pinBadge,
  shortName,
  type GlobeCatalog,
  type GlobeSite,
  unitToLatLon,
  type Vec3,
} from './GlobeModel.js';
import { missionUrl, tileUrl } from './MissionSelect.js';

export interface GlobeEmitter {
  emit<K extends keyof GameEvents>(name: K, payload: GameEvents[K]): void;
}

export type GlobeOpenSource = GameEvents['globe:opened']['source'];

export interface GlobeOptions {
  config: GlobeConfig;
  bus?: GlobeEmitter | null;
  /** Ids from data/tiles/index.json (free-dive availability). */
  tileIds: readonly string[];
  /** The landmark being dived now: highlighted, and the globe starts over it. */
  currentId?: string;
  /** Navigate to a URL (tests inject a spy). Default: `location.href = url`. */
  navigate?: (url: string) => void;
  /** Inject the catalogue (tests); default loads it from /data. */
  catalog?: Promise<GlobeCatalog>;
  parent?: HTMLElement;
  /** In the home shell the globe shares focus with the menu and site grid. */
  embedded?: boolean;
  onSiteFocus?: (id: string) => void;
  onSiteSelected?: (site: GlobeSite) => void;
}

interface Pin {
  site: GlobeSite;
  el: HTMLButtonElement;
  unit: Vec3;
  /** Missions and free dives take part in clustering; catalogue specks do not. */
  playable: boolean;
  /** Last values written to the DOM, so a still globe writes nothing. */
  x: number;
  y: number;
  opacity: number;
  clustered: boolean;
  back: boolean;
  flip: boolean;
}

/** One counted cluster button; pooled, grown on demand. */
interface ClusterEl {
  el: HTMLButtonElement;
  count: HTMLSpanElement;
  /** Seed pin index of the group it shows (-1 while hidden). */
  leader: number;
  size: number;
  hash: number;
  x: number;
  y: number;
  opacity: number;
}

/** Pins sit a hair above the surface so the horizon test is not ambiguous. */
const PIN_ALTITUDE = 1.002;

const EARTH_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewDir;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vNormalW = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  vViewDir = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

// Ocean vs land/ice from the albedo itself: Blue Marble oceans are strongly
// blue-dominant (b / max(r, g) well above 1.5), vegetation, desert and ice are not.
const EARTH_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uHasMap;
uniform float uLandDim;
uniform float uLandSat;
uniform float uOceanGain;
uniform float uGratStep;
uniform float uGratOpacity;
uniform vec3 uAccent;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewDir;
void main() {
  vec3 c = uHasMap > 0.5 ? texture2D(uMap, vUv).rgb : vec3(0.004, 0.02, 0.045);
  float ratio = c.b / max(max(c.r, c.g), 1e-3);
  float ocean = smoothstep(1.25, 1.8, ratio);
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 land = mix(vec3(lum), c, uLandSat) * uLandDim;
  vec3 col = mix(land, c * uOceanGain, ocean);
  float ndv = max(dot(normalize(vNormalW), normalize(vViewDir)), 0.0);
  col *= 0.45 + 0.55 * ndv;
  if (uGratOpacity > 0.0) {
    vec2 g = vec2(vUv.x * 360.0, vUv.y * 180.0) / uGratStep;
    vec2 d = abs(fract(g - 0.5) - 0.5) / max(fwidth(g), vec2(1e-4));
    float line = 1.0 - min(min(d.x, d.y), 1.0);
    col = mix(col, uAccent * 0.5, line * uGratOpacity);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

const RIM_VERT = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vViewDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vNormalW = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  vViewDir = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

// Back faces of a slightly larger shell: brightest just outside the globe's
// limb, fading to nothing at the shell's own silhouette. uEdge is the
// |n.v| of the shell's back face at the globe's limb.
const RIM_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
uniform float uEdge;
varying vec3 vNormalW;
varying vec3 vViewDir;
void main() {
  float d = -dot(normalize(vNormalW), normalize(vViewDir));
  float k = clamp(d / uEdge, 0.0, 1.0);
  gl_FragColor = vec4(uColor * k * k * uStrength, 1.0);
  #include <colorspace_fragment>
}
`;

export class Globe {
  readonly root: HTMLDivElement;
  readonly catalog: Promise<GlobeCatalog>;
  readonly orbit: OrbitState;
  /** Pins in Tab order (missions, free dives, catalogue). Empty until the catalogue loads. */
  sites: GlobeSite[] = [];
  /** True once the Earth texture has loaded (screenshots wait on it). */
  textureReady = false;

  private readonly canvas: HTMLCanvasElement;
  private readonly pinLayer: HTMLDivElement;
  private readonly chooser: HTMLDivElement;
  private readonly card: HTMLDivElement;
  private readonly legend: HTMLDivElement;
  private readonly trap: FocusTrap;
  private readonly chooserTrap: FocusTrap;
  private pins: Pin[] = [];
  private clusterEls: ClusterEl[] = [];
  /** Per-frame scratch, sized to the pin count in setSites (no per-frame allocation). */
  private sx = new Float32Array(0);
  private sy = new Float32Array(0);
  private alpha = new Float32Array(0);
  private eligible = new Uint8Array(0);
  private owner = new Int32Array(0);
  private groupX = new Float32Array(0);
  private groupY = new Float32Array(0);
  private groupN = new Int32Array(0);
  private groupAlpha = new Float32Array(0);
  private groupHash = new Int32Array(0);
  private hitPx = 0;
  private readonly coarse: MediaQueryList | null;
  private chooserLeader = -1;
  private lastPointerType = '';
  private open_ = false;
  private hovered: GlobeSite | null = null;
  private focused: GlobeSite | null = null;
  private pinned: GlobeSite | null = null;
  private readonly heldKeys = new Set<string>();
  private drag: { id: number; x: number; y: number; t: number } | null = null;
  private centred = false;

  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private glFailed = false;
  private resizeObserver: ResizeObserver | null = null;
  private disposed = false;
  private size = { width: 0, height: 0 };
  private readonly tmp = new THREE.Vector3();
  private readonly disposers: Array<() => void> = [];

  constructor(private readonly opts: GlobeOptions) {
    const cfg = opts.config;
    this.orbit = new OrbitState(cfg);

    this.root = el('div', 'globe');
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Dive sites globe');
    if (opts.embedded) {
      this.root.classList.add('is-embedded');
      this.root.setAttribute('role', 'group');
      this.root.removeAttribute('aria-modal');
    }

    this.canvas = el('canvas', 'globe-canvas');
    this.canvas.setAttribute('aria-hidden', 'true');
    this.pinLayer = el('div', 'globe-pins');
    this.pinLayer.setAttribute('role', 'group');
    this.pinLayer.setAttribute('aria-label', 'Dive sites');

    // Pins come first in the DOM so the first Tab lands on a pin.
    const header = el('div', 'globe-header');
    const heading = el('div', 'globe-heading');
    heading.append(
      el('span', 'globe-kicker', 'DIVE SITES'),
      el('span', 'globe-title', 'Choose a site'),
    );
    this.legend = el('div', 'globe-legend', 'LOADING SITES…');
    const close = el('button', 'globe-close', 'ESC  CLOSE');
    close.type = 'button';
    close.addEventListener('click', () => this.close());
    header.append(heading, this.legend, close);

    this.card = el('div', 'globe-card');
    this.card.setAttribute('aria-live', 'polite');
    this.card.hidden = true;
    const hint = el(
      'div',
      'globe-hint',
      'DRAG ROTATE · WHEEL / + − ZOOM · NUMBERED PINS ZOOM IN · TAB PINS · ENTER SELECT · ESC CLOSE',
    );

    this.chooser = el('div', 'globe-chooser');
    this.chooser.setAttribute('role', 'group');
    this.chooser.setAttribute('aria-label', 'Sites here');
    this.chooser.hidden = true;
    const zoom = el('div', 'globe-zoom');
    zoom.setAttribute('role', 'group');
    zoom.setAttribute('aria-label', 'Zoom');
    const zoomButton = (text: string, label: string, factor: number): HTMLButtonElement => {
      const b = el('button', 'globe-zoom-btn', text);
      b.type = 'button';
      b.setAttribute('aria-label', label);
      b.addEventListener('click', () => {
        this.closeChooser();
        this.orbit.zoomBy(factor);
      });
      return b;
    };
    zoom.append(
      zoomButton('+', 'Zoom in', 1 / cfg.keyZoomFactor),
      zoomButton('\u2212', 'Zoom out', cfg.keyZoomFactor),
    );

    this.root.append(this.canvas, this.pinLayer, header, zoom, this.card, this.chooser, hint);
    this.coarse =
      typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: coarse)') : null;
    (opts.parent ?? document.body).appendChild(this.root);
    this.trap = new FocusTrap(this.root, {
      onEscape: () => this.close(),
      onKeyDown: (event) => this.handleKeyDown(event),
    });
    this.chooserTrap = new FocusTrap(this.chooser, {
      onEscape: () => this.closeChooser(),
      onKeyDown: (event) => this.handleKeyDown(event),
    });

    this.bindPointer();
    this.bindKeys();
    const onResize = (): void => {
      if (this.open_) this.resize();
    };
    window.addEventListener('resize', onResize);
    this.disposers.push(() => window.removeEventListener('resize', onResize));
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.open_) this.resize();
      });
      this.resizeObserver.observe(this.root);
    }

    this.catalog = opts.catalog ?? loadGlobeCatalog(opts.tileIds);
    void this.catalog.then((c) => {
      if (!this.disposed) this.setSites(c.sites);
    });
  }

  get isOpen(): boolean {
    return this.open_;
  }

  get pinCount(): number {
    return this.pins.length;
  }

  /** The site whose card is showing (hover > focus > clicked catalogue pin). */
  get cardSite(): GlobeSite | null {
    return this.hovered ?? this.focused ?? this.pinned;
  }

  /** Preview a list selection on the globe without moving keyboard focus. */
  previewSite(id: string): void {
    const site = this.sites.find((entry) => entry.id === id);
    if (!site) return;
    // List navigation supersedes the last globe pointer/focus preview.
    this.hovered = null;
    this.focused = null;
    this.pinned = site;
    this.orbit.faceLatLon(site.lat, site.lon);
    this.renderCard();
  }

  open(source: GlobeOpenSource = 'api'): void {
    if (this.open_ || this.disposed) return;
    this.open_ = true;
    this.root.hidden = false;
    this.initGl();
    this.resize();
    if (!this.opts.embedded) this.trap.show();
    this.orbit.poke();
    this.opts.bus?.emit('globe:opened', { source });
  }

  close(): void {
    if (!this.open_) return;
    this.open_ = false;
    this.root.hidden = true;
    this.heldKeys.clear();
    this.orbit.setHeld(0, 0);
    this.drag = null;
    this.orbit.endDrag();
    this.hovered = null;
    this.closeChooser();
    if (!this.opts.embedded) this.trap.hide();
  }

  toggle(source: GlobeOpenSource = 'api'): void {
    if (this.open_) this.close();
    else this.open(source);
  }

  /** Once per rendered frame (main.ts); does nothing while closed. */
  update(dt: number): void {
    if (!this.open_) return;
    // CSS can change the embedded container without a window resize. This also
    // covers browsers without ResizeObserver before the next presented frame.
    if (this.root.clientWidth !== this.size.width || this.root.clientHeight !== this.size.height)
      this.resize();
    const w = this.root.clientWidth || window.innerWidth;
    const h = this.root.clientHeight || window.innerHeight;
    // The home globe may live in a narrow panel. Its zoomed-out view fits the
    // outer atmosphere shell to the smaller field of view so neither limb is
    // cropped; the player zooms in from there.
    if (this.opts.embedded) {
      const halfVertical = (this.opts.config.fovDeg * Math.PI) / 360;
      const halfHorizontal = Math.atan(Math.tan(halfVertical) * (w / h));
      this.orbit.setFitDistance(
        this.opts.config.atmosphereScale / Math.sin(Math.min(halfVertical, halfHorizontal) * 0.9),
      );
    }
    this.orbit.update(Math.min(dt, 0.1));
    const cam = this.orbit.cameraPosition();
    const cameraDistance = this.orbit.distance;
    if (this.camera) {
      if (cameraDistance + this.opts.config.atmosphereScale >= this.camera.far) {
        this.camera.far = cameraDistance + this.opts.config.atmosphereScale + 1;
        this.camera.updateProjectionMatrix();
      }
      this.camera.position.set(cam.x, cam.y, cam.z);
      this.camera.lookAt(0, 0, 0);
      this.camera.updateMatrixWorld();
      if (this.renderer && this.scene) this.renderer.render(this.scene, this.camera);
      this.placePins(cam, w, h);
    }
  }

  /** Choose a site: missions and tiles navigate; catalogue pins just pin the card. */
  private missionAccess: ((site: GlobeSite) => string | null) | null = null;
  /** Locked mission pins stay focusable so their depth requirement can be read. */
  setMissionAccess(check: (site: GlobeSite) => string | null): void {
    this.missionAccess = check;
    for (const pin of this.pins) {
      const requirement = pin.site.state === 'mission' ? check(pin.site) : null;
      pin.el.setAttribute('aria-disabled', String(!!requirement));
      pin.el.setAttribute(
        'aria-label',
        requirement
          ? `${pin.site.name}. ${requirement}`
          : `${pin.site.name}, ${pin.site.type}, ${formatDepth(pin.site.depthM)}. ${pinBadge(pin.site)}`,
      );
    }
    this.renderCard();
  }
  select(site: GlobeSite): void {
    if (site.state === 'mission' && this.missionAccess?.(site)) {
      this.pinned = site;
      this.renderCard();
      return;
    }
    if (site.state === 'catalogue') {
      this.pinned = site;
      this.renderCard();
      return;
    }
    this.opts.bus?.emit('globe:pinSelected', { landmarkId: site.id });
    this.opts.onSiteSelected?.(site);
    const href = window.location.href;
    const url = site.state === 'mission' ? missionUrl(href, site.id) : tileUrl(href, site.id);
    if (this.opts.navigate) this.opts.navigate(url);
    else window.location.href = url;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.resizeObserver?.disconnect();
    for (const d of this.disposers) d();
    this.close();
    this.chooserTrap.dispose();
    this.trap.dispose();
    this.renderer?.dispose();
    this.root.remove();
  }

  // ------------------------------------------------------------------ pins

  private setSites(sites: GlobeSite[]): void {
    this.sites = sites;
    this.pinLayer.replaceChildren();
    this.clusterEls = [];
    this.closeChooser();
    this.pins = sites.map((site) => {
      const b = el('button', `globe-pin is-${site.state}`);
      b.type = 'button';
      b.dataset.landmark = site.id;
      b.dataset.state = site.state;
      if (site.state === 'mission' && this.missionAccess?.(site))
        b.setAttribute('aria-disabled', 'true');
      if (site.id === this.opts.currentId) b.classList.add('is-current');
      b.setAttribute(
        'aria-label',
        `${site.name}, ${site.type}, ${formatDepth(site.depthM)}. ${site.state === 'mission' ? (this.missionAccess?.(site) ?? pinBadge(site)) : pinBadge(site)}`,
      );
      // The small visible dot sits in a larger transparent button (the hit area).
      b.append(el('span', 'globe-pin-dot'), el('span', 'globe-pin-label', shortName(site.name)));
      b.addEventListener('pointerdown', (e) => {
        this.lastPointerType = e.pointerType;
      });
      b.addEventListener('pointerenter', () => {
        this.hovered = site;
        this.opts.onSiteFocus?.(site.id);
        this.orbit.poke();
        this.renderCard();
      });
      b.addEventListener('pointerleave', () => {
        if (this.hovered === site) this.hovered = null;
        this.renderCard();
      });
      b.addEventListener('focus', () => {
        this.focused = site;
        this.opts.onSiteFocus?.(site.id);
        // Only keyboard focus turns the globe: a mouse press must not move the
        // pin out from under the pointer before the click lands.
        if (b.matches(':focus-visible')) this.orbit.faceLatLon(site.lat, site.lon);
        this.renderCard();
      });
      b.addEventListener('blur', () => {
        if (this.focused === site) this.focused = null;
        this.renderCard();
      });
      b.addEventListener('click', (e) => {
        // First touch tap names the pin (label, card, list highlight); the
        // second tap on it goes. Mouse and keyboard act at once.
        const touchTap = this.lastPointerType === 'touch' && e.detail > 0;
        this.lastPointerType = '';
        if (touchTap && site.state !== 'catalogue' && this.pinned !== site) {
          this.pinned = site;
          this.renderCard();
          return;
        }
        this.select(site);
      });
      this.pinLayer.append(b);
      const u = latLonToUnit(site.lat, site.lon);
      return {
        site,
        el: b,
        unit: { x: u.x * PIN_ALTITUDE, y: u.y * PIN_ALTITUDE, z: u.z * PIN_ALTITUDE },
        playable: site.state !== 'catalogue',
        x: NaN,
        y: NaN,
        opacity: NaN,
        clustered: false,
        back: false,
        flip: false,
      };
    });
    const n = this.pins.length;
    this.sx = new Float32Array(n);
    this.sy = new Float32Array(n);
    this.alpha = new Float32Array(n);
    this.eligible = new Uint8Array(n);
    this.owner = new Int32Array(n);
    this.groupX = new Float32Array(n);
    this.groupY = new Float32Array(n);
    this.groupN = new Int32Array(n);
    this.groupAlpha = new Float32Array(n);
    this.groupHash = new Int32Array(n);
    const count = (s: GlobeSite['state']): number => sites.filter((x) => x.state === s).length;
    this.legend.replaceChildren(
      this.legendItem('is-mission', `${count('mission')} MISSIONS`),
      this.legendItem('is-tile', `${count('tile')} FREE DIVES`),
      this.legendItem('is-catalogue', `${count('catalogue')} CATALOGUE`),
    );
    const current = sites.find((s) => s.id === this.opts.currentId);
    if (current && !this.centred) {
      this.centred = true;
      this.orbit.lat = Math.max(
        -this.opts.config.maxLatDeg,
        Math.min(this.opts.config.maxLatDeg, current.lat),
      );
      this.orbit.lon = current.lon;
    }
  }

  private legendItem(cls: string, text: string): HTMLSpanElement {
    const s = el('span', `globe-legend-item ${cls}`);
    s.append(el('span', 'globe-legend-dot'), document.createTextNode(text));
    return s;
  }

  /** Hit-area side for the current input: set on the root so CSS sizes the buttons to match. */
  private syncHitSize(): number {
    const cfg = this.opts.config;
    const touch =
      document.documentElement.classList.contains('is-touch') || this.coarse?.matches === true;
    const hit = touch ? cfg.pinHitTouchPx : cfg.pinHitPx;
    if (hit !== this.hitPx) {
      this.hitPx = hit;
      this.root.style.setProperty('--globe-hit', `${hit}px`);
    }
    return hit;
  }

  private placePins(cam: Vec3, w: number, h: number): void {
    const camera = this.camera;
    const pins = this.pins;
    const n = pins.length;
    if (!camera || !n) return;
    const hit = this.syncHitSize();
    const { sx, sy, alpha, eligible, owner, groupX, groupY, groupN, groupAlpha, groupHash } = this;
    const fade = this.opts.config.pinHorizonFade;
    const camLen = Math.hypot(cam.x, cam.y, cam.z);
    for (let i = 0; i < n; i++) {
      const p = pins[i];
      const v = this.tmp.set(p.unit.x, p.unit.y, p.unit.z).project(camera);
      const front = facesCamera(p.unit, cam, PIN_ALTITUDE);
      // cos of the angle between the surface normal and the view ray.
      const dx = cam.x - p.unit.x;
      const dy = cam.y - p.unit.y;
      const dz = cam.z - p.unit.z;
      const ndv =
        (p.unit.x * dx + p.unit.y * dy + p.unit.z * dz) /
        (Math.hypot(dx, dy, dz) * PIN_ALTITUDE || 1);
      const a = front && camLen > 0 ? Math.min(1, Math.max(0, ndv / fade)) : 0;
      alpha[i] = a;
      sx[i] = ((v.x + 1) / 2) * w;
      sy[i] = ((1 - v.y) / 2) * h;
      // A focused or pinned pin always stands alone, so Tab can reach a pin
      // that sits inside a cluster and see which one it is.
      eligible[i] =
        p.playable && a > 0.05 && p.site !== this.focused && p.site !== this.pinned ? 1 : 0;
    }
    clusterPins(sx, sy, eligible, n, hit, owner);
    groupX.fill(0, 0, n);
    groupY.fill(0, 0, n);
    groupN.fill(0, 0, n);
    groupAlpha.fill(0, 0, n);
    groupHash.fill(0, 0, n);
    for (let i = 0; i < n; i++) {
      const o = owner[i];
      if (o < 0) continue;
      groupX[o] += sx[i];
      groupY[o] += sy[i];
      groupN[o]++;
      groupAlpha[o] = Math.max(groupAlpha[o], alpha[i]);
      groupHash[o] = (groupHash[o] * 31 + i + 1) | 0;
    }
    const card = this.cardSite;
    for (let i = 0; i < n; i++) {
      const p = pins[i];
      const o = owner[i];
      const clustered = o >= 0 && groupN[o] > 1;
      const back = alpha[i] <= 0.05;
      const opacity = back || clustered ? 0 : Math.round(alpha[i] * 100) / 100;
      // Whole-pixel translations keep the rendered hit box at its CSS size.
      const x = Math.round(sx[i]);
      const y = Math.round(sy[i]);
      if (x !== p.x || y !== p.y) {
        p.x = x;
        p.y = y;
        p.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      }
      if (opacity !== p.opacity) {
        p.opacity = opacity;
        p.el.style.opacity = String(opacity);
      }
      if (back !== p.back) {
        p.back = back;
        p.el.classList.toggle('is-back', back);
      }
      if (clustered !== p.clustered) {
        p.clustered = clustered;
        p.el.classList.toggle('is-clustered', clustered);
      }
      if (p.site === card) {
        // The name label opens toward the middle of the globe, away from the edge.
        const flip = x > w * 0.6;
        if (flip !== p.flip) {
          p.flip = flip;
          p.el.classList.toggle('is-flip', flip);
        }
      }
    }
    let k = 0;
    let chooserSeen = false;
    for (let i = 0; i < n; i++) {
      if (owner[i] !== i || groupN[i] < 2) continue;
      const c = this.clusterEl(k++);
      const size = groupN[i];
      const x = Math.round(groupX[i] / size);
      const y = Math.round(groupY[i] / size);
      if (c.leader !== i || c.size !== size || c.hash !== groupHash[i]) {
        c.leader = i;
        c.size = size;
        c.hash = groupHash[i];
        c.count.textContent = String(size);
        c.el.setAttribute('aria-label', this.clusterLabel(i));
        c.el.hidden = false;
        c.el.dataset.sites = this.clusterIds(i);
      }
      if (x !== c.x || y !== c.y) {
        c.x = x;
        c.y = y;
        c.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      }
      const opacity = Math.round(groupAlpha[i] * 100) / 100;
      if (opacity !== c.opacity) {
        c.opacity = opacity;
        c.el.style.opacity = String(opacity);
      }
      if (this.chooserLeader >= 0 && owner[this.chooserLeader] === i) {
        chooserSeen = true;
        this.chooser.style.transform = `translate(${x}px, ${y}px)`;
      }
    }
    for (; k < this.clusterEls.length; k++) {
      const c = this.clusterEls[k];
      if (c.leader >= 0) {
        c.leader = -1;
        c.size = 0;
        c.hash = 0;
        c.el.hidden = true;
      }
    }
    if (this.chooserLeader >= 0) {
      if (chooserSeen) this.orbit.poke();
      else this.closeChooser();
    }
  }

  private clusterEl(k: number): ClusterEl {
    let c = this.clusterEls[k];
    if (c) return c;
    const b = el('button', 'globe-cluster');
    b.type = 'button';
    // Members are the keyboard path; the cluster is for pointer and touch.
    b.tabIndex = -1;
    const count = el('span', 'globe-cluster-count');
    b.append(count);
    c = { el: b, count, leader: -1, size: 0, hash: 0, x: NaN, y: NaN, opacity: NaN };
    const entry = c;
    b.addEventListener('pointerenter', () => this.orbit.poke());
    b.addEventListener('click', () => this.openCluster(entry.leader));
    this.pinLayer.append(b);
    this.clusterEls[k] = c;
    return c;
  }

  /** Pin indices of the group seeded at `leader` (last placed frame). */
  private clusterMembers(leader: number): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.owner.length; i++) if (this.owner[i] === leader) out.push(i);
    return out;
  }

  private clusterIds(leader: number): string {
    return this.clusterMembers(leader)
      .map((i) => this.pins[i].site.id)
      .join(' ');
  }

  private clusterLabel(leader: number): string {
    const names = this.clusterMembers(leader).map((i) => this.pins[i].site.name);
    return `${names.length} sites: ${names.join(', ')}. Zoom in`;
  }

  /**
   * Click on a cluster: turn to its centre and zoom until the members separate.
   * Already at full zoom with the members still overlapping: offer a chooser.
   */
  private openCluster(leader: number): void {
    if (leader < 0) return;
    const members = this.clusterMembers(leader).map((i) => this.pins[i]);
    if (members.length < 2) return;
    this.closeChooser();
    let x = 0;
    let y = 0;
    let z = 0;
    for (const m of members) {
      x += m.unit.x;
      y += m.unit.y;
      z += m.unit.z;
    }
    const centre = unitToLatLon({ x, y, z });
    // Closest pair decides how far in is needed.
    let theta = Math.PI;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const a = members[i].unit;
        const b = members[j].unit;
        const cos = (a.x * b.x + a.y * b.y + a.z * b.z) / (PIN_ALTITUDE * PIN_ALTITUDE);
        theta = Math.min(theta, Math.acos(Math.max(-1, Math.min(1, cos))));
      }
    }
    const orbit = this.orbit;
    const target = distanceToSeparate(
      theta,
      this.hitPx || this.opts.config.pinHitPx,
      this.size.height || this.root.clientHeight || window.innerHeight,
      this.opts.config.fovDeg,
    );
    if (orbit.distance <= orbit.minDistance * 1.02) {
      this.showChooser(leader, members);
      orbit.faceLatLon(centre.lat, centre.lon);
      return;
    }
    orbit.faceLatLon(centre.lat, centre.lon, Math.min(target, orbit.distance * 0.7));
  }

  private showChooser(leader: number, members: readonly Pin[]): void {
    this.chooserLeader = leader;
    this.chooser.replaceChildren(
      ...members.map((m) => {
        const b = el('button', `globe-chooser-item is-${m.site.state}`);
        b.type = 'button';
        b.dataset.landmark = m.site.id;
        b.append(
          el('span', 'globe-chooser-dot'),
          el('span', 'globe-chooser-name', m.site.name),
          el('span', 'globe-chooser-badge', pinBadge(m.site)),
        );
        b.addEventListener('pointerenter', () => this.opts.onSiteFocus?.(m.site.id));
        b.addEventListener('click', () => {
          this.closeChooser();
          this.select(m.site);
        });
        return b;
      }),
    );
    this.chooserTrap.show();
    // A cluster chooser is a direct selection action: keyboard users should
    // reach its sites immediately, while general overlays keep neutral focus.
    this.chooserTrap.focusables()[0]?.focus();
  }

  private closeChooser(): void {
    this.chooserLeader = -1;
    this.chooserTrap.hide();
  }

  private renderCard(): void {
    const site = this.cardSite;
    this.card.hidden = !site;
    for (const p of this.pins) p.el.classList.toggle('is-active', p.site === site);
    if (!site) return;
    const badge = el('span', `globe-badge is-${site.state}`, pinBadge(site));
    const name = el('h2', 'globe-card-name', site.missionTitle ?? site.name);
    const meta = el(
      'div',
      'globe-card-meta',
      [site.type.toUpperCase(), formatDepth(site.depthM), site.region].filter(Boolean).join(' · '),
    );
    const parts: HTMLElement[] = [badge, name, meta];
    if (site.missionTitle && site.missionTitle !== site.name) {
      parts.push(el('div', 'globe-card-site', site.name));
    }
    if (site.summary) {
      const text =
        site.summary.length > 220 ? `${site.summary.slice(0, 217).trimEnd()}…` : site.summary;
      parts.push(el('p', 'globe-card-summary', text));
    }
    const requirement = site.state === 'mission' ? this.missionAccess?.(site) : null;
    parts.push(el('div', `globe-card-action is-${site.state}`, requirement ?? pinAction(site)));
    this.card.replaceChildren(...parts);
  }

  // ----------------------------------------------------------------- input

  private bindPointer(): void {
    const onDown = (e: PointerEvent): void => {
      if (!this.open_ || e.button !== 0) return;
      const t = e.target as Element | null;
      if (t?.closest('button, a, .globe-card')) return;
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
      this.orbit.beginDrag();
      this.pinned = null;
      this.closeChooser();
      this.renderCard();
      this.root.setPointerCapture?.(e.pointerId);
      this.root.classList.add('is-dragging');
    };
    const onMove = (e: PointerEvent): void => {
      const d = this.drag;
      if (!d || d.id !== e.pointerId) return;
      const now = performance.now();
      this.orbit.drag(e.clientX - d.x, e.clientY - d.y, Math.max(1e-3, (now - d.t) / 1000));
      d.x = e.clientX;
      d.y = e.clientY;
      d.t = now;
    };
    const onUp = (e: PointerEvent): void => {
      const d = this.drag;
      if (!d || d.id !== e.pointerId) return;
      this.drag = null;
      this.orbit.endDrag(e.type === 'pointercancel' ? Infinity : (performance.now() - d.t) / 1000);
      this.root.classList.remove('is-dragging');
    };
    const onWheel = (e: WheelEvent): void => {
      if (!this.open_) return;
      e.preventDefault();
      const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
      this.closeChooser();
      this.orbit.zoomBy(Math.exp(px * this.opts.config.wheelZoomPerPx));
    };
    this.root.addEventListener('pointerdown', onDown);
    this.root.addEventListener('pointermove', onMove);
    this.root.addEventListener('pointerup', onUp);
    this.root.addEventListener('pointercancel', onUp);
    this.root.addEventListener('wheel', onWheel, { passive: false });
  }

  private applyHeld(): void {
    const k = this.heldKeys;
    this.orbit.setHeld(
      (k.has('ArrowRight') ? 1 : 0) - (k.has('ArrowLeft') ? 1 : 0),
      (k.has('ArrowUp') ? 1 : 0) - (k.has('ArrowDown') ? 1 : 0),
    );
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.open_) return;
    if (e.code === 'Tab' || e.code === 'Escape') return;
    if (this.opts.embedded) {
      if (!this.chooserTrap.isTop && !this.root.contains(document.activeElement)) return;
    }
    e.stopImmediatePropagation();
    const code = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
      e.preventDefault();
      this.heldKeys.add(code);
      this.applyHeld();
      return;
    }
    const zoom = this.opts.config.keyZoomFactor;
    if (code === 'Equal' || code === 'NumpadAdd' || e.key === '+') {
      e.preventDefault();
      this.orbit.zoomBy(1 / zoom);
      return;
    }
    if (code === 'Minus' || code === 'NumpadSubtract' || e.key === '-') {
      e.preventDefault();
      this.orbit.zoomBy(zoom);
      return;
    }
    if (code === 'Enter' || code === 'NumpadEnter') {
      // A focused pin/button activates natively; otherwise select the hovered site.
      const a = document.activeElement;
      if (a instanceof HTMLButtonElement && this.root.contains(a)) return;
      const site = this.cardSite;
      if (site) {
        e.preventDefault();
        this.select(site);
      }
    }
  }

  private bindKeys(): void {
    const onKeyDown = (event: KeyboardEvent): void => this.handleKeyDown(event);
    const onKeyUp = (e: KeyboardEvent): void => {
      if (this.heldKeys.delete(e.code)) this.applyHeld();
    };
    // The embedded globe shares its host's Tab/Escape ownership. Its ordinary
    // controls only handle keys targeted inside the globe; modal keys use the stack.
    if (this.opts.embedded) this.root.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp, true);
    this.disposers.push(
      () => this.root.removeEventListener('keydown', onKeyDown),
      () => window.removeEventListener('keyup', onKeyUp, true),
    );
  }

  // ------------------------------------------------------------------- GL

  private initGl(): void {
    if (this.renderer || this.glFailed) return;
    const cfg = this.opts.config;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: this.opts.embedded === true,
      });
    } catch (err) {
      this.glFailed = true;
      console.warn('[globe] WebGL unavailable; showing pins only', err);
      this.camera = new THREE.PerspectiveCamera(cfg.fovDeg, 1, 0.01, 100);
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer = renderer;

    const scene = new THREE.Scene();
    const accent = new THREE.Color(cfg.accentColor);
    const earthMat = new THREE.ShaderMaterial({
      vertexShader: EARTH_VERT,
      fragmentShader: EARTH_FRAG,
      uniforms: {
        uMap: { value: null },
        uHasMap: { value: 0 },
        uLandDim: { value: cfg.landDim },
        uLandSat: { value: cfg.landSaturation },
        uOceanGain: { value: cfg.oceanGain },
        uGratStep: { value: cfg.graticuleDeg },
        uGratOpacity: { value: cfg.graticuleOpacity },
        uAccent: { value: accent },
      },
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(1, 128, 64), earthMat));

    const s = cfg.atmosphereScale;
    const rimMat = new THREE.ShaderMaterial({
      vertexShader: RIM_VERT,
      fragmentShader: RIM_FRAG,
      uniforms: {
        uColor: { value: accent.clone() },
        uStrength: { value: cfg.atmosphereStrength },
        uEdge: { value: Math.sqrt(Math.max(1e-4, 1 - 1 / (s * s))) },
      },
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(s, 96, 48), rimMat));
    this.scene = scene;
    this.camera = new THREE.PerspectiveCamera(cfg.fovDeg, 1, 0.01, 100);

    new THREE.TextureLoader().load(
      cfg.textureUrl,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        earthMat.uniforms.uMap.value = tex;
        earthMat.uniforms.uHasMap.value = 1;
        this.textureReady = true;
      },
      undefined,
      () => console.warn(`[globe] could not load ${cfg.textureUrl}; plain ocean shown`),
    );
  }

  private resize(): void {
    const w = this.root.clientWidth || window.innerWidth;
    const h = this.root.clientHeight || window.innerHeight;
    this.size = { width: w, height: h };
    if (this.renderer) {
      this.renderer.setPixelRatio(
        Math.min(this.opts.config.maxPixelRatio, window.devicePixelRatio || 1),
      );
      this.renderer.setSize(w, h, false);
    }
    if (this.camera) {
      this.camera.aspect = w / Math.max(1, h);
      this.camera.updateProjectionMatrix();
    }
  }
}
