/**
 * Placeholder submarine model built from Three.js primitives.
 *
 * Intentionally a single function returning a Group, so swapping in a real GLB
 * later is a one-line change at the call site:
 *
 *     const model = await new GLTFLoader().loadAsync('/assets/sub.glb');
 *     rig.add(model.scene);
 *
 * Convention: the model faces local -Z; {@link SubMesh.setPose} turns it so the
 * nose follows Submarine.getForward (north at yaw 0, east at yaw +pi/2).
 */

import * as THREE from 'three';

export interface SubMeshOptions {
  /** Overall hull length in metres. */
  length?: number;
  hullColor?: number;
  accentColor?: number;
  /**
   * QA-B #6: below ~300 m the only light is the boat's own, which points
   * away from the hull, so the model rendered as a pure black cut-out. A
   * faint view-dependent (fresnel) rim plus a small emissive floor keeps its
   * outline readable without making it glow. `Config.submarine.hullRim*`.
   */
  rimColor?: number;
  /** 0 disables the rim. */
  rimStrength?: number;
  /** Constant emissive floor on every hull material. */
  emissive?: number;
}

/**
 * Add a fresnel rim to a standard material's emissive term. `normal` and
 * `vViewPosition` are in scope after `normal_fragment_begin`, which runs
 * before `emissivemap_fragment` in MeshStandardMaterial's fragment shader.
 */
function addRim(mat: THREE.MeshStandardMaterial, color: number, strength: number): void {
  if (strength <= 0) return;
  const rim = new THREE.Color(color).multiplyScalar(strength);
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = { value: rim };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRimColor;')
      .replace(
        '#include <emissivemap_fragment>',
        [
          '#include <emissivemap_fragment>',
          'float subRim = 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) );',
          'totalEmissiveRadiance += uRimColor * ( subRim * subRim * subRim );',
        ].join('\n'),
      );
  };
  mat.customProgramCacheKey = () => 'sub-hull-rim';
}

export class SubMesh {
  readonly group = new THREE.Group();
  /** Spins with throttle; exposed so main.ts can animate it. */
  readonly propeller: THREE.Object3D;
  private readonly materials: THREE.Material[] = [];

  constructor(options: SubMeshOptions = {}) {
    const length = options.length ?? 24;
    const radius = length * 0.09;
    const emissive = options.emissive ?? 0x0b1318;
    const hullMat = new THREE.MeshStandardMaterial({
      color: options.hullColor ?? 0x3a4550,
      roughness: 0.55,
      metalness: 0.65,
      emissive,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: options.accentColor ?? 0xd8b43c,
      roughness: 0.5,
      metalness: 0.3,
      emissive,
    });
    const rimColor = options.rimColor ?? 0x6f93a3;
    const rimStrength = options.rimStrength ?? 0.55;
    addRim(hullMat, rimColor, rimStrength);
    addRim(accentMat, rimColor, rimStrength);
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

  /**
   * Place the model from the physics pose. `yaw` is the physics compass angle
   * (+yaw = toward east, Submarine.getForward), so the Three.js Y rotation is
   * `-yaw`; pitch and the cosmetic roll are applied in the hull's own frame
   * (Euler order YXZ), and a negative roll (starboard turn) dips the
   * starboard side, i.e. the hull leans into the turn.
   */
  setPose(position: THREE.Vector3, yaw: number, pitch: number, roll: number): void {
    this.group.position.copy(position);
    this.group.rotation.set(pitch, -yaw, roll, 'YXZ');
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
