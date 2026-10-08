/** Thin carbonate shelves; isolated from the shared black-smoker flange. */
import * as THREE from 'three';
import { fbm3, smooth } from './props/geo/shared.js';

export function lostCityFlange(o: {
  r0: number;
  w: number;
  arc: number;
  start: number;
  seed: number;
  tier: string;
}): THREE.BufferGeometry {
  const { r0, w } = o;
  const low = o.tier === 'low';
  const radialSegments = low ? 28 : o.tier === 'medium' ? 56 : o.tier === 'ultra' ? 96 : 72;
  const th = Math.min(0.28, 0.06 + w * 0.035);
  // A closed half-ellipse around the nose has a vertical tangent at its tip,
  // without spline overshoot when the overhang is much wider than the lip.
  const topSteps = low ? 6 : 14;
  const lipSteps = low ? 6 : 12;
  const profile: THREE.Vector2[] = [];
  const root = r0 * 0.8;
  const nose = r0 + w - th * 0.4;
  for (let i = 0; i <= topSteps; i++) {
    const t = i / topSteps;
    profile.push(
      new THREE.Vector2(
        root + (nose - root) * t,
        th * (0.4 + 0.5 * Math.sin(Math.PI * t) - 0.75 * t),
      ),
    );
  }
  for (let i = 1; i <= lipSteps; i++) {
    const a = Math.PI / 2 - (i / lipSteps) * Math.PI;
    profile.push(
      new THREE.Vector2(nose + th * 0.4 * Math.cos(a), th * (-0.7 + 0.35 * Math.sin(a))),
    );
  }
  for (let i = 1; i <= topSteps; i++) {
    const t = i / topSteps;
    profile.push(
      new THREE.Vector2(
        nose + (root - nose) * t,
        th * (-1.05 - 0.3 * Math.sin(Math.PI * t) + 0.45 * t),
      ),
    );
  }
  const geometry = new THREE.LatheGeometry(profile, radialSegments, o.start, o.arc);
  const p = geometry.getAttribute('position');
  // Use angular index rather than atan2 wrapping, so both sector ends taper
  // symmetrically even when the sector crosses the 2π seam.
  const profileCount = profile.length;
  for (let i = 0; i < p.count; i++) {
    const u = Math.floor(i / profileCount) / radialSegments;
    const a = o.start + u * o.arc;
    const end = smooth(0, 0.16, u) * smooth(0, 0.16, 1 - u);
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const out = smooth(r0, r0 + w, Math.hypot(x, z));
    const scallop = fbm3(Math.cos(a) * 2.2 + 9, 5, Math.sin(a) * 2.2 + 9, o.seed, 2) - 0.5;
    const grain = fbm3(Math.cos(a) * 9 + 3, 2, Math.sin(a) * 9 + 3, o.seed ^ 820, 2) - 0.5;
    const k = (1 + (scallop * 0.28 + grain * 0.045) * out) * (1 - (1 - end) * out * 0.9);
    const yy = y - out * out * w * 0.1 - (scallop * 0.3 + grain * th * 0.25) * out;
    p.setXYZ(i, x * k, yy * (0.25 + 0.75 * end), z * k);
  }
  geometry.deleteAttribute('uv');
  geometry.computeVertexNormals();
  return geometry;
}
