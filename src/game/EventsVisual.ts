import * as THREE from 'three';
import { EXPLORE_CONFIG } from '../core/config/explore.js';
import { PartBin, trs } from '../world/props/wrecks/kit.js';
import { mulberry32 } from '../world/props/builders/shared.js';
import type { ExploreEvent } from './Events.js';

/** One soft particle draw and one merged silhouette, without lights or textures. */
export class EventsVisual {
  readonly group = new THREE.Group();
  /** Current visible centre, used for witnessing rather than the stationary spawn point. */
  readonly origin = new THREE.Vector3();
  private readonly points: THREE.Points;
  private readonly whale: THREE.Mesh;
  private readonly layout: Float32Array;
  private readonly direction = new THREE.Vector3();
  private readonly start = new THREE.Vector3();
  private readonly projected = new THREE.Vector3();
  private readonly ray = new THREE.Ray();
  private readonly sightline = new THREE.Vector3();
  private readonly screenBox = new THREE.Box3();
  private readonly screenCorner = new THREE.Vector3();
  private readonly screenDepth = new THREE.Vector3();
  private ground: (x: number, z: number) => number = () => 0;

  constructor(tier: keyof typeof EXPLORE_CONFIG.eventParticleCount) {
    const n = EXPLORE_CONFIG.eventParticleCount[tier];
    const random = mulberry32(1823);
    this.layout = Float32Array.from({ length: n * 3 }, () => random());
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const material = new THREE.PointsMaterial({
      color: 0xc6d1ce,
      size: EXPLORE_CONFIG.eventParticleSizeM.plume,
      transparent: true,
      opacity: EXPLORE_CONFIG.eventOpacity,
      depthWrite: false,
    });
    // Overlapping soft discs read as billows, rather than square grains. This
    // keeps PointsMaterial's perspective sizing and fog; no texture allocation.
    material.onBeforeCompile = (shader) => {
      // Bound fill work even when the pilot drives into the cloud.
      shader.vertexShader = shader.vertexShader.replace(
        '#include <logdepthbuf_vertex>',
        `gl_PointSize = min(gl_PointSize, ${EXPLORE_CONFIG.eventMaxParticlePx.toFixed(1)});
#include <logdepthbuf_vertex>`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_particle_fragment>',
        `#include <map_particle_fragment>
         float radius = length(gl_PointCoord - vec2(0.5)) * 2.0;
         if (radius > 1.0) discard;
         diffuseColor.a *= 1.0 - smoothstep(0.35, 1.0, radius);`,
      );
    };
    this.points = new THREE.Points(geo, material);
    this.points.name = 'exploreEventParticles';
    this.points.frustumCulled = false;
    const bin = new PartBin();
    bin.add(new THREE.SphereGeometry(1, 12, 8), 0x142b35, trs(0, 0, 0, 0, 0, 0, 1.8, 1.6, 7));
    // Blunt head, paired pectoral fins and separate flukes distinguish the whale
    // from the little fish silhouettes, even on Low's small render target.
    bin.add(new THREE.SphereGeometry(1, 10, 6), 0x142b35, trs(0, 0.1, -5, 0, 0, 0, 1.9, 1.5, 3));
    for (const x of [-1.8, 1.8])
      bin.add(
        new THREE.SphereGeometry(1, 8, 6),
        0x142b35,
        trs(x, 0, 8, 0, x * 0.2, 0, 2.2, 0.2, 1.2),
      );
    for (const x of [-2.5, 2.5])
      bin.add(
        new THREE.SphereGeometry(1, 8, 6),
        0x142b35,
        trs(x, -1.1, -2, 0, x * 0.2, -Math.sign(x) * 0.45, 3, 0.22, 0.8),
      );
    this.whale = new THREE.Mesh(bin.merge()!, new THREE.MeshBasicMaterial({ vertexColors: true }));
    this.whale.name = 'exploreEventWhale';
    this.whale.scale.setScalar(EXPLORE_CONFIG.eventWhaleScale);
    // Banking exposes the flukes and pectoral fins in the crossing profile.
    this.whale.rotation.z = Math.PI / 5;
    this.group.name = 'exploreEvent';
    this.group.add(this.points, this.whale);
    this.group.visible = false;
  }

  /** Defer when the floor/a turned-away camera leaves no honest visible spawn. */
  begin(
    event: ExploreEvent,
    position: THREE.Vector3,
    forward: THREE.Vector3,
    ground: (x: number, z: number) => number,
    camera: THREE.PerspectiveCamera,
  ): boolean {
    this.ground = ground;
    camera.updateMatrixWorld();
    const heading = Math.atan2(forward.x, forward.z);
    let placed = false;
    // All candidates are ahead of the pilot. Checking the active projection also
    // respects free look, cockpit/ROV cameras and the phone's view offset.
    for (const distance of EXPLORE_CONFIG.eventSpawnDistancesM) {
      for (const angle of [-0.35, 0.35, 0, -0.7, 0.7, -1.05, 1.05]) {
        const yaw = heading + angle;
        this.start.set(
          position.x + Math.sin(yaw) * distance,
          0,
          position.z + Math.cos(yaw) * distance,
        );
        const floor = ground(this.start.x, this.start.z);
        this.start.y =
          event.kind === 'whale'
            ? Math.max(
                floor + EXPLORE_CONFIG.eventFloorClearanceM + EXPLORE_CONFIG.eventWhaleHalfHeightM,
                Math.min(-EXPLORE_CONFIG.eventWhaleSurfaceDepthM, position.y + 14),
              )
            : floor + EXPLORE_CONFIG.eventFloorClearanceM;
        if (
          event.kind === 'whale' &&
          (this.start.y > -EXPLORE_CONFIG.eventWhaleSurfaceDepthM || this.start.y <= position.y)
        )
          continue;
        this.origin.copy(this.start);
        if (event.kind === 'plume') this.origin.y += EXPLORE_CONFIG.eventPlumeHeightM / 2;
        if (event.kind === 'turbidity')
          this.origin.y += EXPLORE_CONFIG.eventParticleSizeM.turbidity / 2 + 2;
        const range = this.origin.distanceTo(position);
        this.projected.copy(this.origin).project(camera);
        if (
          range >= 30 &&
          range <= 70 &&
          Math.abs(this.projected.x) < EXPLORE_CONFIG.eventViewMargin &&
          Math.abs(this.projected.y) < EXPLORE_CONFIG.eventViewMargin &&
          this.projected.z > -1 &&
          this.projected.z < 1
        ) {
          this.ray.set(
            camera.position,
            this.sightline.copy(this.origin).sub(camera.position).normalize(),
          );
          if (this.ray.distanceToPoint(position) < 7) continue;
          let clear = true;
          for (let step = 1; step < 10; step++) {
            this.sightline.lerpVectors(camera.position, this.origin, step / 10);
            if (this.sightline.y < ground(this.sightline.x, this.sightline.z) + 1) {
              clear = false;
              break;
            }
          }
          if (!clear) continue;
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
    if (!placed) {
      this.group.visible = false;
      return false;
    }
    if (event.kind === 'turbidity') {
      // Negative height gradient gives actual local downslope travel. A flat
      // patch follows the viewing direction until the next lower bed sample.
      this.direction.set(
        ground(this.start.x - 8, this.start.z) - ground(this.start.x + 8, this.start.z),
        0,
        ground(this.start.x, this.start.z - 8) - ground(this.start.x, this.start.z + 8),
      );
      if (this.direction.lengthSq() < 0.0001) this.direction.copy(forward).setY(0);
    } else {
      this.direction.setFromMatrixColumn(camera.matrixWorld, 0).setY(0);
    }
    this.direction.normalize();
    this.whale.rotation.y = Math.atan2(-this.direction.x, -this.direction.z);
    this.group.position.copy(this.start);
    this.update(event);
    return true;
  }

  update(event: ExploreEvent | null): void {
    this.group.visible = event !== null;
    if (!event) return;
    const { kind, elapsedS: t, durationS } = event;
    this.whale.visible = kind === 'whale';
    this.points.visible = kind !== 'whale';
    this.group.position.copy(this.start);
    if (kind === 'whale') {
      this.group.position.addScaledVector(this.direction, t * EXPLORE_CONFIG.eventWhaleSpeedMps);
      this.group.position.y = Math.max(
        this.start.y + Math.sin(t * 0.5) * 0.4,
        this.ground(this.group.position.x, this.group.position.z) +
          EXPLORE_CONFIG.eventFloorClearanceM +
          EXPLORE_CONFIG.eventWhaleHalfHeightM,
      );
      this.origin.copy(this.group.position);
      return;
    }
    if (kind === 'turbidity') {
      this.group.position.addScaledVector(this.direction, t * EXPLORE_CONFIG.eventCloudSpeedMps);
      this.group.position.y =
        this.ground(this.group.position.x, this.group.position.z) +
        EXPLORE_CONFIG.eventFloorClearanceM;
    }
    const mat = this.points.material as THREE.PointsMaterial;
    // Already visible on the first frame; fade only at the end, so announcing
    // never points at an invisible effect. Counts stay at the existing tier budget.
    mat.opacity = EXPLORE_CONFIG.eventOpacity * Math.min(1, (durationS - t) / 3);
    mat.color.setHex(kind === 'plume' ? 0xc6d1ce : 0xb6a07a);
    mat.size = EXPLORE_CONFIG.eventParticleSizeM[kind];
    const pos = this.points.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const a = this.layout[i * 3],
        b = this.layout[i * 3 + 1],
        c = this.layout[i * 3 + 2];
      let x: number, y: number, z: number;
      if (kind === 'plume') {
        const age =
          (b + (t * EXPLORE_CONFIG.eventPlumeRiseMps) / EXPLORE_CONFIG.eventPlumeHeightM) % 1;
        const phase = a * Math.PI * 2 + t * 0.35;
        const radius = Math.sqrt(c) * (1 + age * 5);
        x = Math.cos(phase) * radius + Math.sin(age * 9 + t) * age * 1.5;
        z = Math.sin(phase) * radius;
        y = mat.size / 2 + age * EXPLORE_CONFIG.eventPlumeHeightM;
      } else {
        const roll = b * Math.PI * 2 - t * 0.8;
        x = (a - 0.5) * EXPLORE_CONFIG.eventCloudWidthM;
        z = (c - 0.5) * EXPLORE_CONFIG.eventCloudDepthM + Math.cos(roll) * 2;
        y = mat.size / 2 + 2 + Math.sin(roll) * 2;
      }
      // Disc edges stay clear of detailed relief across the whole moving cloud.
      y = Math.max(
        y,
        this.ground(this.group.position.x + x, this.group.position.z + z) +
          EXPLORE_CONFIG.eventFloorClearanceM +
          mat.size / 2 -
          this.group.position.y,
      );
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
    this.origin.copy(this.group.position);
    this.origin.y += kind === 'plume' ? EXPLORE_CONFIG.eventPlumeHeightM / 2 : mat.size / 2 + 2;
  }

  /** A conservative projected envelope for placing the DOM caption outside the event. */
  screenBounds(
    camera: THREE.PerspectiveCamera,
    width: number,
    height: number,
  ): { x: number; y: number; width: number; height: number } | null {
    if (!this.group.visible) return null;
    const object = this.whale.visible ? this.whale : this.points;
    if (object === this.points || !object.geometry.boundingBox)
      object.geometry.computeBoundingBox();
    object.updateWorldMatrix(true, false);
    camera.updateMatrixWorld();
    this.screenBox.copy(object.geometry.boundingBox!).applyMatrix4(object.matrixWorld);
    let nearDepth = Infinity;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const x of [this.screenBox.min.x, this.screenBox.max.x])
      for (const y of [this.screenBox.min.y, this.screenBox.max.y])
        for (const z of [this.screenBox.min.z, this.screenBox.max.z]) {
          this.screenCorner.set(x, y, z);
          nearDepth = Math.min(
            nearDepth,
            -this.screenDepth.copy(this.screenCorner).applyMatrix4(camera.matrixWorldInverse).z,
          );
          this.screenCorner.project(camera);
          if (this.screenCorner.z < -1 || this.screenCorner.z > 1) continue;
          const px = ((this.screenCorner.x + 1) * width) / 2;
          const py = ((1 - this.screenCorner.y) * height) / 2;
          minX = Math.min(minX, px);
          minY = Math.min(minY, py);
          maxX = Math.max(maxX, px);
          maxY = Math.max(maxY, py);
        }
    if (!Number.isFinite(minX)) return null;
    // Include soft sprite edges, not only the Points' centres.
    const padding =
      object === this.points
        ? Math.min(
            EXPLORE_CONFIG.eventMaxParticlePx / 2,
            ((this.points.material as THREE.PointsMaterial).size * height) /
              (4 * Math.max(1, nearDepth)),
          )
        : 0;
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    };
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.whale.geometry.dispose();
    (this.whale.material as THREE.Material).dispose();
    this.group.removeFromParent();
  }
}
