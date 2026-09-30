/**
 * Cockpit viewport (F1-VEHICLES): what the first-person view looks through.
 *
 * The first-person camera keeps its gameplay pose (Config.camera
 * firstPersonOffset); this overlay only frames it as the view out of the
 * pressure sphere's forward viewport: a thick titanium bezel with a bolt
 * circle, a faint acrylic sheen, and the lower edge of the pilot's console
 * with a few lit screens. It is drawn last and always passes the depth test, so terrain can
 * never cut into it, and it follows whatever camera renders it (the matrix is
 * set in `onBeforeRender`, after the rig has moved the camera this frame).
 *
 * The aperture is an ellipse fitted to the camera's aspect so the frame only
 * darkens the corners: it must never make the view frustratingly small or
 * dark. `apertureFor` is pure and unit-tested.
 */

import * as THREE from 'three';

/** Distance of the overlay in front of the eye (just past the 0.5 m near plane). */
export const COCKPIT_DEPTH_M = 0.62;

export interface Aperture {
  /** Half-width and half-height of the visible frustum at the overlay depth. */
  halfW: number;
  halfH: number;
  /** Ellipse radii of the clear viewport opening. */
  rx: number;
  ry: number;
}

/**
 * Viewport opening for a camera: a wide ellipse that reaches the middle of
 * each screen edge and leaves only the corners behind the bezel. With
 * `k = 1.08` the clear opening is ~88 % of a 16:9 frame.
 */
export function apertureFor(
  fovDeg: number,
  aspect: number,
  depth = COCKPIT_DEPTH_M,
  k = 1.08,
): Aperture {
  const halfH = Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2) * depth;
  const halfW = halfH * aspect;
  return { halfW, halfH, rx: halfW * k, ry: halfH * k };
}

/** Fraction of the screen inside the ellipse (for tests and budgets). */
export function clearFraction(a: Aperture, samples = 64): number {
  let inside = 0;
  for (let j = 0; j < samples; j++) {
    for (let i = 0; i < samples; i++) {
      const x = ((i + 0.5) / samples) * 2 - 1;
      const y = ((j + 0.5) / samples) * 2 - 1;
      const ex = (x * a.halfW) / a.rx;
      const ey = (y * a.halfH) / a.ry;
      if (ex * ex + ey * ey <= 1) inside++;
    }
  }
  return inside / (samples * samples);
}

export class CockpitView {
  /** Add to the scene; it positions itself on the rendering camera. */
  readonly object = new THREE.Group();
  private readonly bezel: THREE.Mesh;
  private readonly bolts: THREE.InstancedMesh;
  private readonly sheen: THREE.Mesh | null;
  private readonly console: THREE.Mesh;
  private readonly screens: THREE.Mesh;
  private readonly materials: THREE.Material[] = [];
  private readonly boltCount: number;
  private key = '';
  private readonly local = new THREE.Matrix4();

  /** `detailed`: bolts ring + acrylic sheen (every tier but low). */
  constructor(detailed = true) {
    this.object.name = 'cockpit-view';
    this.object.visible = false;
    // Always passes the depth test (terrain can never cut in) and writes depth,
    // so the additive beams and snow drawn later stay behind the frame. (With
    // the depth test disabled, WebGL would skip the depth write too.)
    const overlay = {
      depthTest: true,
      depthFunc: THREE.AlwaysDepth,
      depthWrite: true,
      fog: false,
    } as const;
    // Unlit with baked shading: the sub's own lamps and fill light sit right
    // next to the camera and would otherwise blow the frame out to white.
    const bezelMat = new THREE.MeshBasicMaterial({ vertexColors: true, ...overlay });
    const boltMat = new THREE.MeshBasicMaterial({ color: 0x39434a, ...overlay });
    const consoleMat = new THREE.MeshBasicMaterial({ color: 0x0b1013, ...overlay });
    const screenMat = new THREE.MeshBasicMaterial({ vertexColors: true, ...overlay });
    this.materials.push(bezelMat, boltMat, consoleMat, screenMat);

    this.bezel = new THREE.Mesh(new THREE.BufferGeometry(), bezelMat);
    this.boltCount = detailed ? 28 : 0;
    this.bolts = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(1, 1, 0.6, 8).rotateX(Math.PI / 2),
      boltMat,
      Math.max(1, this.boltCount),
    );
    this.bolts.count = this.boltCount;
    this.console = new THREE.Mesh(new THREE.BufferGeometry(), consoleMat);
    this.screens = new THREE.Mesh(new THREE.BufferGeometry(), screenMat);
    const parts: THREE.Object3D[] = [this.console, this.screens, this.bezel, this.bolts];
    if (detailed) {
      const sheenMat = new THREE.MeshBasicMaterial({
        color: 0x9fd3e0,
        transparent: true,
        opacity: 0.011,
        blending: THREE.AdditiveBlending,
        ...overlay,
        depthWrite: false,
      });
      this.materials.push(sheenMat);
      this.sheen = new THREE.Mesh(new THREE.BufferGeometry(), sheenMat);
      parts.unshift(this.sheen);
    } else this.sheen = null;
    parts.forEach((m, i) => {
      m.frustumCulled = false;
      m.renderOrder = 1000 + i;
      m.onBeforeRender = (_r, _s, camera) => this.place(m, camera);
      this.object.add(m);
    });
  }

  /** Lock a part to the camera and refit the aperture if the view changed. */
  private place(m: THREE.Object3D, camera: THREE.Camera): void {
    const cam = camera as THREE.PerspectiveCamera;
    if (cam.isPerspectiveCamera) this.fit(cam.fov, cam.aspect);
    m.matrixWorld.multiplyMatrices(camera.matrixWorld, this.local);
  }

  /** Rebuild the geometry for a field of view and aspect (cheap; only on change). */
  fit(fovDeg: number, aspect: number): void {
    const key = `${fovDeg.toFixed(2)}:${aspect.toFixed(3)}`;
    if (key === this.key) return;
    this.key = key;
    const a = apertureFor(fovDeg, aspect);
    this.local.makeTranslation(0, 0, -COCKPIT_DEPTH_M);

    // Bezel: the screen rectangle (with margin) minus the ellipse.
    const outer = new THREE.Shape();
    const W = a.halfW * 1.2;
    const H = a.halfH * 1.2;
    outer.moveTo(-W, -H).lineTo(W, -H).lineTo(W, H).lineTo(-W, H).lineTo(-W, -H);
    const hole = new THREE.Path();
    hole.absellipse(0, 0, a.rx, a.ry, 0, Math.PI * 2, true, 0);
    outer.holes.push(hole);
    const bevel = a.halfH * 0.035;
    const bezelG = new THREE.ExtrudeGeometry(outer, {
      depth: bevel,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel * 1.4,
      bevelSegments: 3,
      curveSegments: 72,
    });
    bezelG.translate(0, 0, -bevel);
    shadeBezel(bezelG, a);
    this.bezel.geometry.dispose();
    this.bezel.geometry = bezelG;

    // Bolt circle just outside the opening.
    const r = a.halfH * 0.018;
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(r, r, r);
    const m = new THREE.Matrix4();
    for (let i = 0; i < this.boltCount; i++) {
      const t = (i / this.boltCount) * Math.PI * 2;
      const p = new THREE.Vector3(
        Math.cos(t) * (a.rx + r * 3.2),
        Math.sin(t) * (a.ry + r * 3.2),
        bevel * 1.2,
      );
      this.bolts.setMatrixAt(i, m.compose(p, q, s));
    }
    this.bolts.instanceMatrix.needsUpdate = true;

    // Acrylic sheen: a soft diagonal band across the opening.
    if (this.sheen) {
      const g = new THREE.PlaneGeometry(a.rx * 0.5, a.ry * 2.2);
      g.rotateZ(-0.5);
      g.translate(-a.rx * 0.35, a.ry * 0.1, -0.01);
      this.sheen.geometry.dispose();
      this.sheen.geometry = g;
    }

    // Console lip along the bottom edge, below the opening's lowest point
    // only near the centre (the ellipse bottoms out at -ry, off screen).
    const lipH = a.halfH * 0.12;
    const lip = new THREE.BoxGeometry(a.halfW * 0.9, lipH, bevel * 3);
    lip.translate(0, -a.halfH + lipH * 0.45, bevel * 2);
    this.console.geometry.dispose();
    this.console.geometry = lip;

    // Screens on the lip: sonar green, nav cyan, power amber.
    const colors: Array<[number, number, number]> = [
      [0.15, 0.75, 0.45],
      [0.2, 0.7, 0.95],
      [0.95, 0.6, 0.18],
    ];
    const screens: THREE.BufferGeometry[] = colors.map((c, i) => {
      const g = new THREE.PlaneGeometry(a.halfW * 0.16, lipH * 0.5);
      g.translate((i - 1) * a.halfW * 0.24, -a.halfH + lipH * 0.5, bevel * 3.6);
      const n = g.getAttribute('position').count;
      const col = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) col.set([c[0] * 0.6, c[1] * 0.6, c[2] * 0.6], k * 3);
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      return g.toNonIndexed();
    });
    const merged = mergeSimple(screens);
    screens.forEach((g) => g.dispose());
    this.screens.geometry.dispose();
    this.screens.geometry = merged;
  }

  /** Triangles in the overlay (tier budget checks). */
  get triangles(): number {
    let n = 0;
    for (const m of [this.bezel, this.console, this.screens, this.sheen]) {
      if (!m) continue;
      const g = m.geometry;
      n += (g.index ? g.index.count : (g.getAttribute('position')?.count ?? 0)) / 3;
    }
    const bg = this.bolts.geometry;
    n += ((bg.index ? bg.index.count : bg.getAttribute('position').count) / 3) * this.boltCount;
    return Math.round(n);
  }

  dispose(): void {
    for (const m of [this.bezel, this.console, this.screens, this.sheen]) m?.geometry.dispose();
    this.bolts.dispose();
    this.bolts.geometry.dispose();
    for (const m of this.materials) m.dispose();
    this.object.removeFromParent();
  }
}

/**
 * Bake the bezel's shading: dark gunmetal, a soft highlight on the machined
 * inner lip, and a touch of top light on upward-facing bevels.
 */
function shadeBezel(g: THREE.BufferGeometry, a: Aperture): void {
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const nrm = g.getAttribute('normal') as THREE.BufferAttribute;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    // Only the bevel carries the lip highlight: the flat front face is a few
    // huge triangles, and a highlight on its vertices would smear across it.
    const d = Math.hypot(pos.getX(i) / a.rx, pos.getY(i) / a.ry);
    const bevel = Math.abs(nrm.getZ(i)) < 0.95;
    const lip = bevel ? Math.exp(-Math.max(0, d - 1) * 30) * 0.13 : 0;
    const top = Math.max(0, nrm.getY(i)) * 0.05 + Math.max(0, nrm.getZ(i)) * 0.015;
    const v = 0.03 + lip + top;
    col[i * 3] = v * 0.92;
    col[i * 3 + 1] = v * 1.02;
    col[i * 3 + 2] = v * 1.1;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

/** Concatenate non-indexed geometries with position + color. */
function mergeSimple(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const total = gs.reduce((n, g) => n + g.getAttribute('position').count, 0);
  const pos = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  let o = 0;
  for (const g of gs) {
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    const c = g.getAttribute('color') as THREE.BufferAttribute;
    pos.set(p.array as Float32Array, o * 3);
    col.set(c.array as Float32Array, o * 3);
    o += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}
