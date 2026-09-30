/**
 * One instanced mesh per species: the model geometry (built once per detail
 * level), its animated material and a per-instance `iLife` attribute
 * (phase, unused, glow) that the renderer rewrites each frame.
 */

import * as THREE from 'three';
import { buildSpeciesGeometry } from './models/index.js';
import { createLifeMaterial } from './models/material.js';
import type { SpeciesDef } from './types.js';

export interface SpeciesMesh {
  def: SpeciesDef;
  mesh: THREE.InstancedMesh;
  life: THREE.InstancedBufferAttribute;
  capacity: number;
}

export function createSpeciesMesh(
  def: SpeciesDef,
  detail: 0 | 1 | 2,
  capacity: number,
): SpeciesMesh {
  const geometry = buildSpeciesGeometry(def.model, def.look, def.size, detail);
  const look = def.look;
  const num = (k: string, d: number): number =>
    typeof look[k] === 'number' ? (look[k] as number) : d;
  const baseGlow = def.glow === 'steady' ? 0.9 : def.glow === 'photophores' ? 0.55 : 0;
  const material = createLifeMaterial({
    mode: def.anim,
    amp: def.amp,
    len: def.size,
    wave: num('wave', 4.5),
    vertical: def.vertical === true,
    glowColor: def.glowColor,
    baseGlow,
    tintGlow: look.tintGlow === true,
    translucent: typeof look.translucent === 'number' ? look.translucent : undefined,
    roughness: num('rough', 0.5),
    metalness: num('metal', 0.05),
  });
  const life = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
  life.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('iLife', life);
  const mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.name = `life:${def.id}`;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.count = 0;
  return { def, mesh, life, capacity };
}

export function disposeSpeciesMesh(m: SpeciesMesh): void {
  m.mesh.geometry.dispose();
  (m.mesh.material as THREE.Material).dispose();
  m.mesh.dispose();
}
