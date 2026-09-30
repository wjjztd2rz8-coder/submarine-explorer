/**
 * Hull markings (F1-VEHICLES): hull numbers, names, depth ratings, a fictional
 * expedition flag and warning placards, painted into one canvas atlas per
 * vehicle and applied as thin planes merged into a single decal mesh.
 *
 * The flag is deliberately not a national flag: a navy field with a white
 * swell line and an orange disc, the fleet's own ensign.
 *
 * Needs a 2D canvas, so it returns null in node (the unit tests) and the
 * vehicle simply has no markings there.
 */

import * as THREE from 'three';
import { PartBuilder, T } from './kit.js';

export type DecalKind = 'name' | 'number' | 'rating' | 'flag' | 'warning' | 'placard';

export interface DecalText {
  name: string;
  number: string;
  rating: string;
  /** Text colours on the fairing (dark on white) and on the accent (light on colour). */
  ink: string;
  accent: string;
}

/** Atlas regions in UV space (0..1), [u0, v0, u1, v1]. */
const REGIONS: Record<DecalKind, [number, number, number, number]> = {
  name: [0, 0.75, 1, 1],
  number: [0, 0.5, 0.5, 0.75],
  rating: [0.5, 0.5, 1, 0.75],
  flag: [0, 0.25, 0.3, 0.5],
  warning: [0.3, 0.25, 1, 0.5],
  placard: [0, 0, 0.5, 0.25],
};

function canvas2d(w: number, h: number): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c.getContext('2d');
}

/** Paint the atlas; null when there is no 2D canvas. */
export function decalAtlas(text: DecalText): THREE.CanvasTexture | null {
  const W = 1024;
  const H = 1024;
  const ctx = canvas2d(W, H);
  if (!ctx) return null;
  ctx.clearRect(0, 0, W, H);
  const rect = (k: DecalKind): [number, number, number, number] => {
    const [u0, v0, u1, v1] = REGIONS[k];
    // Canvas y runs down; texture v runs up (flipY on upload).
    return [u0 * W, (1 - v1) * H, (u1 - u0) * W, (v1 - v0) * H];
  };
  const fitText = (k: DecalKind, s: string, color: string, weight = 800, stretch = 1): void => {
    const [x, y, w, h] = rect(k);
    ctx.save();
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let size = h * 0.78;
    ctx.font = `${weight} ${size}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
    const measured = ctx.measureText(s).width * stretch;
    if (measured > w * 0.94) size *= (w * 0.94) / measured;
    ctx.font = `${weight} ${size}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`;
    ctx.translate(x + w / 2, y + h / 2 + size * 0.04);
    ctx.scale(stretch, 1);
    ctx.fillText(s, 0, 0);
    ctx.restore();
  };
  // Letter-spaced name.
  fitText('name', text.name.split('').join(' '), text.ink, 800, 1);
  fitText('number', text.number, text.ink, 900, 1);
  fitText('rating', text.rating, text.accent, 900, 1);
  // Flag: navy field, white swell line, orange disc, white hoist band.
  {
    const [x, y, w, h] = rect('flag');
    const fx = x + w * 0.04;
    const fy = y + h * 0.12;
    const fw = w * 0.92;
    const fh = h * 0.76;
    ctx.fillStyle = '#10284a';
    ctx.fillRect(fx, fy, fw, fh);
    ctx.fillStyle = '#f2f2ee';
    ctx.fillRect(fx, fy, fw * 0.1, fh);
    ctx.fillStyle = '#f26a1b';
    ctx.beginPath();
    ctx.arc(fx + fw * 0.62, fy + fh * 0.4, fh * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f2f2ee';
    ctx.lineWidth = fh * 0.085;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const px = fx + fw * 0.12 + t * fw * 0.86;
      const py = fy + fh * 0.72 + Math.sin(t * Math.PI * 3) * fh * 0.07;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  // Warning stripe: yellow/black chevrons with a caption.
  {
    const [x, y, w, h] = rect('warning');
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y + h * 0.1, w, h * 0.34);
    ctx.clip();
    ctx.fillStyle = '#f2b90f';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#111';
    for (let i = -4; i < 40; i++) {
      const sx = x + i * h * 0.34;
      ctx.beginPath();
      ctx.moveTo(sx, y + h * 0.1);
      ctx.lineTo(sx + h * 0.17, y + h * 0.1);
      ctx.lineTo(sx + h * 0.51, y + h * 0.44);
      ctx.lineTo(sx + h * 0.34, y + h * 0.44);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#111';
    ctx.font = `800 ${h * 0.3}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DANGER · THRUSTER', x + w / 2, y + h * 0.72);
  }
  // Placard: "RESCUE / LIFT HERE" style panel.
  {
    const [x, y, w, h] = rect('placard');
    ctx.fillStyle = '#f26a1b';
    ctx.fillRect(x + w * 0.04, y + h * 0.18, w * 0.92, h * 0.64);
    ctx.fillStyle = '#fff';
    ctx.font = `800 ${h * 0.22}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RESCUE · LIFT HERE', x + w / 2, y + h * 0.5);
  }
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

/** One decal placement: a plane on a hull side. */
export interface DecalSpec {
  kind: DecalKind;
  /** Centre (vehicle metres). */
  pos: THREE.Vector3;
  /** Plane width and height (m). */
  w: number;
  h: number;
  /** Outward normal: +X or -X for side markings, +Y for the deck. */
  normal: THREE.Vector3;
  /** Rotation about the normal (radians). */
  roll?: number;
}

/**
 * Add decal planes (slot `decal`), remapping each plane's UVs into its atlas
 * region. Side planes read left-to-right from outside the hull.
 */
export function addDecals(pb: PartBuilder, decals: DecalSpec[]): void {
  for (const d of decals) {
    const g = new THREE.PlaneGeometry(d.w, d.h);
    const [u0, v0, u1, v1] = REGIONS[d.kind];
    const uv = g.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
    }
    // Plane faces +Z; turn it to face the normal, keeping "up" as up.
    const n = d.normal.clone().normalize();
    const up = Math.abs(n.y) > 0.9 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
    const xAxis = new THREE.Vector3().crossVectors(up, n).normalize();
    const yAxis = new THREE.Vector3().crossVectors(n, xAxis);
    const m = new THREE.Matrix4().makeBasis(xAxis, yAxis, n).setPosition(d.pos);
    if (d.roll) m.multiply(T(0, 0, 0, 0, 0, d.roll));
    pb.add('decal', g, m);
  }
}
