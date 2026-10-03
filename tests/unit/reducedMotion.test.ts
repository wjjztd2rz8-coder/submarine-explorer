import { Group, Mesh, MeshBasicMaterial, Points, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { drawWithReducedMotion } from '../../src/render/reducedMotion.js';
import { buildVehicle } from '../../src/vehicles/index.js';

describe('reduced-motion rendering', () => {
  it('suppresses nested particles only during the draw and preserves owner visibility', () => {
    const scene = new Scene();
    const group = new Group();
    const particles = new Points();
    const alreadyHidden = new Points();
    alreadyHidden.visible = false;
    const landmark = new Mesh();
    group.add(particles, alreadyHidden, landmark);
    scene.add(group);
    drawWithReducedMotion(scene, true, () => {
      expect(particles.visible).toBe(false);
      expect(alreadyHidden.visible).toBe(false);
      expect(landmark.visible).toBe(true);
    });
    expect(particles.visible).toBe(true);
    expect(alreadyHidden.visible).toBe(false);
    drawWithReducedMotion(scene, false, () => expect(particles.visible).toBe(true));
    expect(() =>
      drawWithReducedMotion(scene, true, () => {
        throw new Error('draw failed');
      }),
    ).toThrow('draw failed');
    expect(particles.visible).toBe(true);
  });

  it('switches the vehicle strobe to a steady lamp at the flash peak', () => {
    const vehicle = buildVehicle('B', 'high');
    const material = vehicle.strobe!.material as MeshBasicMaterial;
    vehicle.update({}, 0);
    expect(material.color.r).toBeGreaterThan(1);
    vehicle.reduceMotion = true;
    vehicle.update({}, 0);
    expect(material.color.r).toBeCloseTo(0.55);
    expect(material.color.g).toBeCloseTo(0.62);
    vehicle.reduceMotion = false;
    vehicle.update({}, 0);
    expect(material.color.r).toBeGreaterThan(1);
    vehicle.dispose();
  });
});
