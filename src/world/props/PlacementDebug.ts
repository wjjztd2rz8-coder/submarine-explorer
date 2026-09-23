/**
 * `?debugProps=1` placement tool (docs/props.md).
 *
 * A small DOM panel lists the loaded props. Click a list row, or click a prop
 * in the viewport, to select it. With a prop selected:
 *
 *   Arrow keys / Alt+W A S D   nudge north / west / south / east (Shift = x10)
 *   PageUp / PageDown          raise / lower (`y_offset_m`)
 *   [ / ]                      rotate heading -/+ (`heading_deg`)
 *   Esc                        deselect (the sub's controls work again)
 *
 * Every change re-places the prop and prints the updated props.json entry to
 * the console and the panel, with a copy button. Nothing is saved: paste the
 * entry back into the landmark's props.json yourself.
 */

import * as THREE from 'three';
import type { PropsConfig } from '../../core/Config.js';
import { METERS_PER_DEG_LAT, metersPerDegLon } from '../../util/geo.js';
import type { PlacedProp, Props } from '../Props.js';

const round = (v: number, digits: number): number => Number(v.toFixed(digits));

export class PlacementDebug {
  private readonly panel: HTMLDivElement;
  private readonly list: HTMLUListElement;
  private readonly out: HTMLPreElement;
  private selected: PlacedProp | null = null;
  private helper: THREE.BoxHelper | null = null;
  private readonly raycaster = new THREE.Raycaster();
  private downAt: { x: number; y: number } | null = null;

  constructor(
    private readonly props: Props,
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.Camera,
    private readonly canvas: HTMLCanvasElement,
    private readonly cfg: PropsConfig,
  ) {
    this.panel = document.createElement('div');
    this.panel.className = 'props-debug';
    this.panel.innerHTML = `
      <div class="props-debug-title">PROPS DEBUG</div>
      <ul class="props-debug-list"></ul>
      <pre class="props-debug-json">Click a prop (list or viewport) to select it.</pre>
      <div class="props-debug-row">
        <button type="button" class="props-debug-copy">Copy JSON</button>
        <span class="props-debug-status"></span>
      </div>
      <div class="props-debug-help">Arrows / Alt+WASD move (Shift x10) &middot; PgUp/PgDn height &middot; [ ] heading &middot; Esc deselect</div>`;
    this.list = this.panel.querySelector('.props-debug-list') as HTMLUListElement;
    this.out = this.panel.querySelector('.props-debug-json') as HTMLPreElement;
    const status = this.panel.querySelector('.props-debug-status') as HTMLSpanElement;
    (this.panel.querySelector('.props-debug-copy') as HTMLButtonElement).addEventListener(
      'click',
      () => {
        if (!this.selected) return;
        const text = JSON.stringify(this.selected.def.raw, null, 2);
        void navigator.clipboard?.writeText(text).then(
          () => (status.textContent = 'copied'),
          () => (status.textContent = 'copy blocked: select the text instead'),
        );
      },
    );
    document.body.appendChild(this.panel);

    // Capture phase on window runs before Input's bubble-phase listener, so a
    // handled key never also steers the sub.
    window.addEventListener('keydown', this.onKey, { capture: true });
    canvas.addEventListener('pointerdown', (e) => (this.downAt = { x: e.clientX, y: e.clientY }));
    canvas.addEventListener('pointerup', this.onClick);
    this.refresh();
  }

  /** Rebuild the list (call after props have loaded). */
  refresh(): void {
    this.list.textContent = '';
    for (const p of this.props.placed) {
      const li = document.createElement('li');
      li.textContent = `${p.def.id}  ${p.def.model.replace('/assets/models/', '')}`;
      li.dataset.propId = p.def.id;
      li.addEventListener('click', () => this.select(p));
      this.list.appendChild(li);
    }
    if (!this.props.placed.length) {
      const li = document.createElement('li');
      li.textContent = '(no props for this landmark)';
      this.list.appendChild(li);
    }
  }

  select(prop: PlacedProp | null): void {
    this.selected = prop;
    for (const li of this.list.querySelectorAll('li')) {
      li.classList.toggle('selected', !!prop && li.dataset.propId === prop.def.id);
    }
    if (this.helper) {
      this.scene.remove(this.helper);
      this.helper.dispose();
      this.helper = null;
    }
    if (!prop) {
      this.out.textContent = 'Click a prop (list or viewport) to select it.';
      return;
    }
    this.helper = new THREE.BoxHelper(prop.root, 0x2ed9d9);
    this.scene.add(this.helper);
    this.print();
  }

  private print(): void {
    if (!this.selected) return;
    const json = JSON.stringify(this.selected.def.raw);
    console.info(`[props] ${json}`);
    this.out.textContent = JSON.stringify(this.selected.def.raw, null, 2);
  }

  private readonly onClick = (e: PointerEvent): void => {
    if (!this.downAt) return;
    const moved = Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y);
    this.downAt = null;
    if (moved > 4) return; // a drag (mouse-look), not a click
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.props.pick(this.raycaster);
    if (hit) this.select(hit);
  };

  private readonly onKey = (e: KeyboardEvent): void => {
    const p = this.selected;
    if (!p) return;
    const step = e.shiftKey ? this.cfg.debugNudgeFastM : this.cfg.debugNudgeM;
    let north = 0;
    let east = 0;
    let up = 0;
    let turn = 0;
    const alt = e.altKey;
    switch (e.code) {
      case 'ArrowUp':
        north = step;
        break;
      case 'ArrowDown':
        north = -step;
        break;
      case 'ArrowLeft':
        east = -step;
        break;
      case 'ArrowRight':
        east = step;
        break;
      case 'KeyW':
        if (alt) north = step;
        break;
      case 'KeyS':
        if (alt) north = -step;
        break;
      case 'KeyA':
        if (alt) east = -step;
        break;
      case 'KeyD':
        if (alt) east = step;
        break;
      case 'PageUp':
        up = step;
        break;
      case 'PageDown':
        up = -step;
        break;
      case 'BracketLeft':
        turn = -this.cfg.debugRotateDeg;
        break;
      case 'BracketRight':
        turn = this.cfg.debugRotateDeg;
        break;
      case 'Escape':
        this.select(null);
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      default:
        return;
    }
    if (!north && !east && !up && !turn) return;
    e.preventDefault();
    e.stopImmediatePropagation();

    const def = p.def;
    def.lat = round(def.lat + north / METERS_PER_DEG_LAT, 6);
    def.lon = round(def.lon + east / metersPerDegLon(def.lat), 6);
    def.yOffsetM = round(def.yOffsetM + up, 2);
    def.headingDeg = round((((def.headingDeg + turn) % 360) + 360) % 360, 2);
    def.raw.lat = def.lat;
    def.raw.lon = def.lon;
    def.raw.heading_deg = def.headingDeg;
    if (def.yOffsetM !== 0 || def.raw.y_offset_m !== undefined) def.raw.y_offset_m = def.yOffsetM;
    void this.props.replace(p).then(() => {
      this.helper?.setFromObject(p.root);
      this.print();
    });
  };
}
