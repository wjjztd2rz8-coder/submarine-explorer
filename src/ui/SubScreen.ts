import * as THREE from 'three';
import {
  COSMETIC_CHOICES,
  cosmeticRequirement,
  discoveryCount,
  type CosmeticSlot,
} from '../game/Cosmetics.js';
import type { Progress } from '../game/Progress.js';
import type { SubMesh } from '../sub/SubMesh.js';
import { el } from './dom.js';
import { FocusTrap } from './FocusTrap.js';

const SLOTS: ReadonlyArray<readonly [CosmeticSlot, string]> = [
  ['paint', 'Sub paint'],
  ['trim', 'Lamp trim'],
  ['decal', 'Sub decal'],
  ['frame', 'Photo frame'],
];

/** A choice's colour dot, when it has one. */
function tint(slot: CosmeticSlot, id: string): string | null {
  const def: { id: string; swatch?: string; color?: unknown } | undefined = COSMETIC_CHOICES[
    slot
  ].find((choice) => choice.id === id);
  const color = def?.swatch ?? def?.color;
  return typeof color === 'string' ? color : null;
}

/** "Your sub": large cosmetic choices beside a slowly turning preview of the boat. */
export class SubScreen {
  readonly root: HTMLDivElement;
  private readonly trap: FocusTrap;
  private readonly stage = el('div', 'ss-stage');
  private readonly options = el('div', 'ss-options');
  private readonly note = el('p', 'ss-note');
  private preview: { mesh: SubMesh; stop(): void } | null = null;
  private opening = 0;

  constructor(
    private readonly progress: () => Progress,
    parent: HTMLElement = document.body,
  ) {
    this.root = el('div', 'field-guide sub-screen');
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Your sub');
    const panel = el('div', 'ss-panel');
    const header = el('div', 'ss-header');
    const close = el('button', 'ss-close', 'Back');
    close.type = 'button';
    close.addEventListener('click', () => this.close());
    header.append(el('h2', undefined, 'Your sub'), close);
    const side = el('div', 'ss-side');
    side.append(this.options, this.note);
    const main = el('div', 'ss-main');
    main.append(this.stage, side);
    panel.append(header, main);
    this.root.append(panel);
    parent.append(this.root);
    this.trap = new FocusTrap(this.root, { onEscape: () => this.close() });
  }

  get isOpen(): boolean {
    return this.trap.active;
  }

  open(): void {
    if (this.isOpen) return;
    document.exitPointerLock?.();
    this.render();
    this.trap.show();
    const token = ++this.opening;
    void this.startPreview(token);
  }

  close(): void {
    this.opening++;
    this.stopPreview();
    this.trap.hide();
  }

  dispose(): void {
    this.close();
    this.trap.dispose();
    this.root.remove();
  }

  private render(): void {
    const progress = this.progress();
    const readOnly = progress.save.readOnly;
    const chosen = progress.cosmetics;
    this.options.replaceChildren();
    for (const [slot, label] of SLOTS) {
      const group = el('div', 'ss-group');
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', label);
      group.append(el('h3', undefined, label));
      const row = el('div', 'ss-row');
      for (const def of COSMETIC_CHOICES[slot]) {
        const owned = progress.ownsCosmetic(def);
        const button = el('button', 'ss-opt');
        button.type = 'button';
        button.dataset.cosmetic = slot;
        button.dataset.id = def.id;
        button.disabled = readOnly || !owned;
        button.setAttribute('aria-pressed', String(chosen[slot] === def.id));
        const color = tint(slot, def.id);
        const dot = el('span', 'ss-dot');
        if (color) dot.style.background = color;
        button.append(dot, el('span', 'ss-name', def.name));
        if (!owned) button.append(el('small', undefined, cosmeticRequirement(def)));
        button.addEventListener('click', () => {
          if (!progress.selectCosmetic(slot, def.id)) return;
          for (const other of row.querySelectorAll('button'))
            other.setAttribute('aria-pressed', String(other === button));
          this.preview?.mesh.setCosmetics(progress.cosmetics);
        });
        row.append(button);
      }
      group.append(row);
      this.options.append(group);
    }
    this.note.textContent = `${discoveryCount(progress.snapshot())} discoveries · cosmetics only · changes apply next dive`;
  }

  /** A small private renderer, created per opening so it holds no GL context while closed. */
  private async startPreview(token: number): Promise<void> {
    const { SubMesh } = await import('../sub/SubMesh.js');
    if (token !== this.opening) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return; // No WebGL: the choices still work without a preview.
    }
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xdcecff, 0x1a3a4a, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-20, 30, 25);
    scene.add(key);
    const mesh = new SubMesh({ tier: 'medium', cosmetics: this.progress().cosmetics });
    mesh.setView('chase');
    scene.add(mesh.group);
    const box = new THREE.Box3().setFromObject(mesh.group);
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) * 0.5;
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, radius * 20);
    const dist = radius / Math.sin((camera.fov * Math.PI) / 360);
    camera.position.set(0, radius * 0.35, dist);
    camera.lookAt(box.getCenter(new THREE.Vector3()));
    this.stage.replaceChildren(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    let frame = 0;
    let last = performance.now();
    const draw = (now: number): void => {
      frame = requestAnimationFrame(draw);
      mesh.group.rotation.y += (now - last) * 0.0005;
      last = now;
      const w = this.stage.clientWidth;
      const h = this.stage.clientHeight;
      if (w && h) {
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(draw);
    this.preview = {
      mesh,
      stop: () => {
        cancelAnimationFrame(frame);
        mesh.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      },
    };
  }

  private stopPreview(): void {
    this.preview?.stop();
    this.preview = null;
  }
}
