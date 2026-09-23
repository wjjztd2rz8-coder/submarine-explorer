/**
 * Globe mission select (C1, docs/globe.md): a full-screen DOM overlay with its
 * own canvas and a small dedicated Three.js renderer (never the game canvas).
 *
 * - Earth: NASA Blue Marble Next Generation with topography and bathymetry
 *   (public domain; ATTRIBUTION.md), styled ocean-forward in the shader: land
 *   and ice dimmed and desaturated, a cyan hairline graticule, a hairline rim.
 * - Pins: one real `<button>` per landmark in data/landmarks.json, projected
 *   over the canvas every frame, so Tab / Enter / screen readers work without
 *   a custom focus model. Three states (GlobeModel.resolvePinState): mission,
 *   tile (free dive), catalogue (card only). Pins that overlap on screen are
 *   fanned out on a small ring with a hairline leader to the true position.
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
import { FocusTrap } from './FocusTrap.js';
import {
  facesCamera,
  formatDepth,
  latLonToUnit,
  loadGlobeCatalog,
  OrbitState,
  pinAction,
  pinBadge,
  spreadOverlaps,
  type GlobeCatalog,
  type GlobeSite,
  type ScreenPin,
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
  /** True for the codes bound to `toggleGlobe`, so the same key closes it. */
  isToggleKey?: (code: string) => boolean;
  /** Navigate to a URL (tests inject a spy). Default: `location.href = url`. */
  navigate?: (url: string) => void;
  /** Inject the catalogue (tests); default loads it from /data. */
  catalog?: Promise<GlobeCatalog>;
  parent?: HTMLElement;
}

interface Pin {
  site: GlobeSite;
  el: HTMLButtonElement;
  line: SVGLineElement;
  unit: Vec3;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Pins sit a hair above the surface so the horizon test is not ambiguous. */
const PIN_ALTITUDE = 1.002;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

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
  private readonly lines: SVGSVGElement;
  private readonly card: HTMLDivElement;
  private readonly legend: HTMLDivElement;
  private readonly trap: FocusTrap;
  private pins: Pin[] = [];
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

    this.canvas = el('canvas', 'globe-canvas');
    this.canvas.setAttribute('aria-hidden', 'true');
    this.lines = document.createElementNS(SVG_NS, 'svg');
    this.lines.classList.add('globe-leaders');
    this.lines.setAttribute('aria-hidden', 'true');
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
      'DRAG ROTATE · WHEEL / + − ZOOM · ARROWS ORBIT · TAB PINS · ENTER SELECT · ESC CLOSE',
    );

    this.root.append(this.canvas, this.lines, this.pinLayer, header, this.card, hint);
    (opts.parent ?? document.body).appendChild(this.root);
    this.trap = new FocusTrap(this.root);

    this.bindPointer();
    this.bindKeys();
    const onResize = (): void => {
      if (this.open_) this.resize();
    };
    window.addEventListener('resize', onResize);
    this.disposers.push(() => window.removeEventListener('resize', onResize));

    this.catalog = opts.catalog ?? loadGlobeCatalog(opts.tileIds);
    void this.catalog.then((c) => this.setSites(c.sites));
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

  open(source: GlobeOpenSource = 'api'): void {
    if (this.open_) return;
    this.open_ = true;
    this.root.hidden = false;
    this.initGl();
    this.resize();
    this.trap.activate();
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
    this.trap.deactivate();
  }

  toggle(source: GlobeOpenSource = 'api'): void {
    if (this.open_) this.close();
    else this.open(source);
  }

  /** Once per rendered frame (main.ts); does nothing while closed. */
  update(dt: number): void {
    if (!this.open_) return;
    this.orbit.update(Math.min(dt, 0.1));
    const cam = this.orbit.cameraPosition();
    const w = this.root.clientWidth || window.innerWidth;
    const h = this.root.clientHeight || window.innerHeight;
    if (this.camera) {
      this.camera.position.set(cam.x, cam.y, cam.z);
      this.camera.lookAt(0, 0, 0);
      this.camera.updateMatrixWorld();
      if (this.renderer && this.scene) this.renderer.render(this.scene, this.camera);
      this.placePins(cam, w, h);
    }
  }

  /** Choose a site: missions and tiles navigate; catalogue pins just pin the card. */
  select(site: GlobeSite): void {
    if (site.state === 'catalogue') {
      this.pinned = site;
      this.renderCard();
      return;
    }
    this.opts.bus?.emit('globe:pinSelected', { landmarkId: site.id });
    const href = window.location.href;
    const url = site.state === 'mission' ? missionUrl(href, site.id) : tileUrl(href, site.id);
    if (this.opts.navigate) this.opts.navigate(url);
    else window.location.href = url;
  }

  dispose(): void {
    for (const d of this.disposers) d();
    this.trap.deactivate();
    this.renderer?.dispose();
    this.root.remove();
  }

  // ------------------------------------------------------------------ pins

  private setSites(sites: GlobeSite[]): void {
    this.sites = sites;
    this.pinLayer.replaceChildren();
    this.lines.replaceChildren();
    this.pins = sites.map((site) => {
      const b = el('button', `globe-pin is-${site.state}`);
      b.type = 'button';
      b.dataset.landmark = site.id;
      b.dataset.state = site.state;
      if (site.id === this.opts.currentId) b.classList.add('is-current');
      b.setAttribute(
        'aria-label',
        `${site.name}, ${site.type}, ${formatDepth(site.depthM)}. ${pinBadge(site)}`,
      );
      b.append(el('span', 'globe-pin-dot'));
      b.addEventListener('pointerenter', () => {
        this.hovered = site;
        this.orbit.poke();
        this.renderCard();
      });
      b.addEventListener('pointerleave', () => {
        if (this.hovered === site) this.hovered = null;
        this.renderCard();
      });
      b.addEventListener('focus', () => {
        this.focused = site;
        this.orbit.faceLatLon(site.lat, site.lon);
        this.renderCard();
      });
      b.addEventListener('blur', () => {
        if (this.focused === site) this.focused = null;
        this.renderCard();
      });
      b.addEventListener('click', () => this.select(site));
      const line = document.createElementNS(SVG_NS, 'line');
      this.lines.append(line);
      this.pinLayer.append(b);
      const u = latLonToUnit(site.lat, site.lon);
      return {
        site,
        el: b,
        line,
        unit: { x: u.x * PIN_ALTITUDE, y: u.y * PIN_ALTITUDE, z: u.z * PIN_ALTITUDE },
      };
    });
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

  private placePins(cam: Vec3, w: number, h: number): void {
    const camera = this.camera;
    if (!camera || !this.pins.length) return;
    const fade = this.opts.config.pinHorizonFade;
    const camLen = Math.hypot(cam.x, cam.y, cam.z);
    const screen: ScreenPin[] = [];
    const alpha: number[] = [];
    for (const p of this.pins) {
      const v = this.tmp.set(p.unit.x, p.unit.y, p.unit.z).project(camera);
      const front = facesCamera(p.unit, cam, PIN_ALTITUDE);
      // cos of the angle between the surface normal and the view ray.
      const dx = cam.x - p.unit.x;
      const dy = cam.y - p.unit.y;
      const dz = cam.z - p.unit.z;
      const ndv =
        (p.unit.x * dx + p.unit.y * dy + p.unit.z * dz) /
        (Math.hypot(dx, dy, dz) * PIN_ALTITUDE || 1);
      const a = front ? Math.min(1, Math.max(0, ndv / fade)) : 0;
      alpha.push(camLen > 0 ? a : 0);
      screen.push({ x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h, visible: a > 0.05 });
    }
    const spread = spreadOverlaps(screen, this.opts.config.pinOverlapPx);
    for (let i = 0; i < this.pins.length; i++) {
      const p = this.pins[i];
      const s = spread[i];
      const a = alpha[i];
      const visible = screen[i].visible;
      p.el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`;
      p.el.style.opacity = visible ? a.toFixed(2) : '0';
      p.el.classList.toggle('is-back', !visible);
      if (visible && s.group > 1) {
        p.line.setAttribute('x1', screen[i].x.toFixed(1));
        p.line.setAttribute('y1', screen[i].y.toFixed(1));
        p.line.setAttribute('x2', s.x.toFixed(1));
        p.line.setAttribute('y2', s.y.toFixed(1));
        p.line.style.opacity = (a * 0.8).toFixed(2);
      } else {
        p.line.style.opacity = '0';
      }
    }
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
    parts.push(el('div', `globe-card-action is-${site.state}`, pinAction(site)));
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
      this.orbit.zoomBy(Math.exp(px * this.opts.config.wheelZoomPerPx));
    };
    this.root.addEventListener('pointerdown', onDown);
    this.root.addEventListener('pointermove', onMove);
    this.root.addEventListener('pointerup', onUp);
    this.root.addEventListener('pointercancel', onUp);
    this.root.addEventListener('wheel', onWheel, { passive: false });
  }

  private bindKeys(): void {
    const arrows: Record<string, true> = {
      ArrowUp: true,
      ArrowDown: true,
      ArrowLeft: true,
      ArrowRight: true,
    };
    const applyHeld = (): void => {
      const k = this.heldKeys;
      this.orbit.setHeld(
        (k.has('ArrowRight') ? 1 : 0) - (k.has('ArrowLeft') ? 1 : 0),
        (k.has('ArrowUp') ? 1 : 0) - (k.has('ArrowDown') ? 1 : 0),
      );
    };
    const onKeyDown = (e: KeyboardEvent): void => {
      if (!this.open_) return;
      // Nothing behind the globe sees keys while it is up: not the game's
      // Input, the guide, the briefing, nor capture listeners on window
      // registered after this one (mission router, settings; the globe is
      // built first). Tab only stops propagating, so the FocusTrap listener on
      // this same node and phase still cycles focus.
      if (e.code === 'Tab') e.stopPropagation();
      else e.stopImmediatePropagation();
      const code = e.code;
      if (code === 'Escape' || (!e.repeat && this.opts.isToggleKey?.(code))) {
        e.preventDefault();
        this.close();
        return;
      }
      if (arrows[code]) {
        e.preventDefault();
        this.heldKeys.add(code);
        applyHeld();
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
    };
    const onKeyUp = (e: KeyboardEvent): void => {
      if (this.heldKeys.delete(e.code)) applyHeld();
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    this.disposers.push(
      () => window.removeEventListener('keydown', onKeyDown, true),
      () => window.removeEventListener('keyup', onKeyUp, true),
    );
  }

  // ------------------------------------------------------------------- GL

  private initGl(): void {
    if (this.renderer || this.glFailed) return;
    const cfg = this.opts.config;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
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
    this.lines.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }
}
