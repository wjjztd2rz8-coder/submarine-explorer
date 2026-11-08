import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  buildEnduranceRelief,
  enduranceRidges,
  enduranceScourHeight,
} from '../../src/world/presets/EnduranceRelief.js';

describe('Endurance ice-scour ridges (shared by the 3D swells and the sonar)', () => {
  const centre = { x: 10, z: -20 };
  const ridges = enduranceRidges(centre);

  it('is deterministic with ten ridges 45-170 m from the hull', () => {
    expect(ridges).toHaveLength(10);
    expect(enduranceRidges(centre)).toEqual(ridges);
    for (const r of ridges) {
      const d = Math.hypot(r.cx - centre.x, r.cz - centre.z);
      expect(d).toBeGreaterThanOrEqual(55 - 1e-6);
      expect(d).toBeLessThanOrEqual(170 + 1e-6);
    }
  });

  it('peaks on a ridge crest, never exceeds the tallest ridge sum, and is zero far away', () => {
    const r = ridges[0]!;
    const crest = enduranceScourHeight(ridges, r.cx - r.dz * r.bend, r.cz + r.dx * r.bend);
    expect(crest).toBeGreaterThan(1);
    expect(crest).toBeLessThan(ridges.reduce((a, k) => a + k.height, 0) + 1e-6);
    expect(enduranceScourHeight(ridges, 5000, 5000)).toBe(0);
    expect(enduranceScourHeight(ridges, centre.x, centre.z)).toBeGreaterThanOrEqual(0);
  });

  it.each([0, 0.12])('fades every mesh boundary into terrain with slope %s', (slope) => {
    const mesh = buildEnduranceRelief(
      {
        sampleHeight: (x, z) => -3000 + slope * (x - z),
        getNormal: (_x, _z, out = new THREE.Vector3()) => out.set(-slope, 1, slope).normalize(),
        widthM: 1000,
        depthM: 1000,
      },
      new THREE.Vector3(centre.x, -2990, centre.z),
    );
    const material = mesh.material as THREE.MeshBasicMaterial;
    try {
      const colors = mesh.geometry.getAttribute('color');
      const positions = mesh.geometry.getAttribute('position');
      expect(colors.itemSize).toBe(4);
      expect(colors.count).toBe(positions.count);
      expect(Array.from(colors.array).every(Number.isFinite)).toBe(true);
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
      for (let r = 0; r < ridges.length; r++) {
        const alpha = (i: number, j: number) => colors.getW(r * 29 * 7 + i * 7 + j);
        for (let i = 0; i <= 28; i++) {
          for (let j = 0; j <= 6; j++) {
            expect(alpha(i, j)).toBeGreaterThanOrEqual(0);
            expect(alpha(i, j)).toBeLessThanOrEqual(1);
            // sin(pi) and cos(pi/2) leave tiny floating-point residues at the perimeter.
            if (i === 0 || i === 28 || j === 0 || j === 6) expect(alpha(i, j)).toBeCloseTo(0, 10);
            if (j < 3) expect(alpha(i, j)).toBeLessThanOrEqual(alpha(i, j + 1));
            if (j > 3) expect(alpha(i, j)).toBeLessThanOrEqual(alpha(i, j - 1));
          }
        }
        expect(alpha(14, 3)).toBe(1);
        expect(alpha(1, 1)).toBeGreaterThan(0);
        expect(alpha(1, 1)).toBeLessThan(1);
      }
      expect(material.vertexColors).toBe(true);
      expect(material.transparent).toBe(true);
      expect(material.depthTest).toBe(true);
      expect(material.depthWrite).toBe(false);
      expect(material.blending).toBe(THREE.NormalBlending);
      expect(material.side).toBe(THREE.FrontSide);
      // Alpha adds no geometry or extra material passes to the original merged ridges.
      expect(positions.count).toBe(2030);
      expect(mesh.geometry.index!.count / 3).toBe(3360);
      expect(mesh.geometry.groups).toHaveLength(0);
      expect(mesh.children).toHaveLength(0);
      expect(Array.isArray(mesh.material)).toBe(false);
    } finally {
      mesh.geometry.dispose();
      material.dispose();
    }
  });
});
