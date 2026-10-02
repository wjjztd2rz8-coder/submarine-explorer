import * as THREE from 'three';
import { EXPLORE_CONFIG } from '../core/config/explore.js';
import { PartBin, trs } from '../world/props/wrecks/kit.js';
import { mulberry32 } from '../world/props/builders/shared.js';
import type { ExploreEvent } from './Events.js';

/** One cheap particle draw and a merged whale silhouette; no added lights or textures. */
export class EventsVisual {
  readonly group = new THREE.Group();
  readonly origin = new THREE.Vector3();
  private readonly points: THREE.Points;
  private readonly whale: THREE.Mesh;
  private readonly layout: Float32Array;
  constructor(tier: keyof typeof EXPLORE_CONFIG.eventParticleCount) {
    const n = EXPLORE_CONFIG.eventParticleCount[tier];
    const random = mulberry32(1823);
    this.layout = Float32Array.from({ length: n * 3 }, () => random());
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xd5dcd4,
        size: 0.25,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      }),
    );
    this.points.frustumCulled = false;
    const bin = new PartBin();
    bin.add(new THREE.SphereGeometry(1, 12, 8), 0x243f48, trs(0, 0, 0, 0, 0, 0, 1.8, 1.6, 7));
    bin.add(new THREE.SphereGeometry(1, 8, 6), 0x243f48, trs(0, 0, 8, 0, 0, 0, 3.8, 0.18, 1.5));
    for (const x of [-2.5, 2.5])
      bin.add(
        new THREE.SphereGeometry(1, 8, 6),
        0x243f48,
        trs(x, -0.5, -2, 0, x * 0.2, 0, 3, 0.16, 0.8),
      );
    this.whale = new THREE.Mesh(
      bin.merge()!,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
    );
    this.group.add(this.points, this.whale);
    this.group.visible = false;
  }
  begin(
    event: ExploreEvent,
    position: THREE.Vector3,
    forward: THREE.Vector3,
    ground: (x: number, z: number) => number,
  ): void {
    this.origin.copy(position).addScaledVector(forward, event.kind === 'whale' ? 42 : 25);
    if (event.kind === 'plume' || event.kind === 'turbidity')
      this.origin.y = ground(this.origin.x, this.origin.z) + EXPLORE_CONFIG.eventFloorClearanceM;
    if (event.kind === 'whale') this.origin.y = Math.min(-8, position.y + 18);
    this.group.position.copy(this.origin);
    this.group.visible = true;
  }
  update(event: ExploreEvent | null): void {
    this.group.visible = event !== null;
    if (!event) return;
    const { kind, elapsedS: t, durationS } = event;
    this.whale.visible = kind === 'whale';
    this.points.visible = kind !== 'whale';
    this.whale.position.set((t / durationS - 0.5) * 70, Math.sin(t) * 0.3, 0);
    this.whale.rotation.y = -Math.PI / 2;
    const mat = this.points.material as THREE.PointsMaterial;
    mat.opacity = Math.sin((Math.PI * t) / durationS) * 0.7;
    mat.color.setHex(kind === 'plume' ? 0x899998 : kind === 'turbidity' ? 0xa69679 : 0xdce9df);
    mat.size = kind === 'snow' ? 0.22 : 1.1;
    const pos = this.points.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const a = this.layout[i * 3],
        b = this.layout[i * 3 + 1],
        c = this.layout[i * 3 + 2];
      const x =
        (a - 0.5) * (kind === 'plume' ? 8 + t * 1.5 : 45) +
        (kind === 'turbidity' ? t * 2 : t * 0.4);
      const y =
        kind === 'plume'
          ? b * 22 + t * 1.4
          : kind === 'snow'
            ? ((b * 30 - t * 0.8 + 30) % 30) - 15
            : b * 4;
      pos.setXYZ(i, x, y, (c - 0.5) * (kind === 'plume' ? 10 : 35));
    }
    pos.needsUpdate = true;
  }
  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.whale.geometry.dispose();
    (this.whale.material as THREE.Material).dispose();
    this.group.removeFromParent();
  }
}
