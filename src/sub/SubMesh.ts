/**
 * Placeholder submarine model built from Three.js primitives.
 *
 * Intentionally a single function returning a Group, so swapping in a real GLB
 * later is a one-line change at the call site:
 *
 *     const model = await new GLTFLoader().loadAsync('/assets/sub.glb');
 *     rig.add(model.scene);
 *
 * Convention: the model faces -Z (north at yaw 0), matching Submarine.getForward.
 */

import * as THREE from 'three';

export interface SubMeshOptions {
  /** Overall hull length in metres. */
  length?: number;
  hullColor?: number;
  accentColor?: number;
}

export class SubMesh {
  readonly group = new THREE.Group();
  /** Spins with throttle; exposed so main.ts can animate it. */
  readonly propeller: THREE.Object3D;
  private readonly materials: THREE.Material[] = [];

  constructor(options: SubMeshOptions = {}) {
    const length = options.length ?? 24;
    const radius = length * 0.09;
    const hullMat = new THREE.MeshStandardMaterial({
      color: options.hullColor ?? 0x3a4550,
      roughness: 0.55,
      metalness: 0.65,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: options.accentColor ?? 0xd8b43c,
      roughness: 0.5,
      metalness: 0.3,
    });
    this.materials.push(hullMat, accentMat);

    // Hull: a capsule lying along Z (capsules are built along Y, so rotate).
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length * 0.62, 6, 16), hullMat);
    hull.rotation.x = Math.PI / 2;
    this.group.add(hull);

    // Nose cone, pointing -Z.
    const nose = new THREE.Mesh(new THREE.ConeGeometry(radius, length * 0.18, 16), hullMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -length * 0.5;
    this.group.add(nose);

    // Sail / conning tower.
    const sail = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 0.7, radius * 1.5, length * 0.2),
      accentMat,
    );
    sail.position.set(0, radius * 1.1, -length * 0.05);
    this.group.add(sail);

    // Dive planes on the sail.
    const plane = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 3.2, radius * 0.16, length * 0.07),
      accentMat,
    );
    plane.position.set(0, radius * 1.5, -length * 0.05);
    this.group.add(plane);

    // Tail fins: a cross of four.
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(
        new THREE.BoxGeometry(radius * 2.4, radius * 0.14, length * 0.12),
        hullMat,
      );
      fin.position.z = length * 0.42;
      fin.rotation.z = (i * Math.PI) / 2;
      this.group.add(fin);
    }

    // Propeller hub + blades, at the stern (+Z).
    this.propeller = new THREE.Group();
    this.propeller.position.z = length * 0.52;
    const hub = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.25, 8, 6), accentMat);
    this.propeller.add(hub);
    for (let i = 0; i < 5; i++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(radius * 0.9, radius * 0.08, radius * 0.35),
        accentMat,
      );
      blade.position.x = radius * 0.55;
      blade.rotation.z = (i * Math.PI * 2) / 5;
      blade.position.set(
        Math.cos((i * Math.PI * 2) / 5) * radius * 0.55,
        Math.sin((i * Math.PI * 2) / 5) * radius * 0.55,
        0,
      );
      blade.rotation.z = (i * Math.PI * 2) / 5;
      this.propeller.add(blade);
    }
    this.group.add(this.propeller);

    this.group.name = 'submarine';
  }

  /** Spin the propeller. `throttle` is -1..1, `dt` seconds. */
  update(throttle: number, dt: number): void {
    this.propeller.rotation.z += throttle * 24 * dt;
  }

  dispose(): void {
    this.group.traverse((o) => {
      (o as THREE.Mesh).geometry?.dispose?.();
    });
    for (const m of this.materials) m.dispose();
  }
}
