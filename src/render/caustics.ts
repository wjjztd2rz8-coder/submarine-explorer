/**
 * Pre-baked caustic frames for the projector spotlight in `Atmosphere`.
 *
 * Why pre-baked: `THREE.SpotLight.map` samples the texture in the light's own
 * projective frame, so a `texture.offset` scroll does nothing -- the pattern
 * has to change in the pixels. Redrawing a canvas every frame from JS is far
 * too slow, so a short loop of frames is rasterised once at load and cycled at
 * `Config.water.causticsFps`. Ten 128px frames cost ~65 KB of VRAM and a few
 * tens of milliseconds to generate.
 *
 * The pattern is the standard interference-of-wavefronts caustic: four
 * iterations of a phase-displaced sine lattice, sharpened with a high power so
 * the bright filaments read as focused light rather than a blur.
 */

import * as THREE from 'three';

const FRAMES = 10;

/** Intensity of the caustic web at (u, v) in [0,1) and loop phase `t`. */
function causticAt(u: number, v: number, t: number): number {
  const px = u * 6.2831853 - 3.14159;
  const py = v * 6.2831853 - 3.14159;
  let ix = px;
  let iy = py;
  let c = 1;
  const inten = 0.004;
  for (let n = 0; n < 4; n++) {
    const tn = t * (1 - 3.5 / (n + 1));
    const nx = px + (Math.cos(tn - ix) + Math.sin(tn + iy));
    const ny = py + (Math.sin(tn - iy) + Math.cos(tn + ix));
    ix = nx;
    iy = ny;
    const dx = px / (Math.sin(ix + tn) / inten);
    const dy = py / (Math.cos(iy + tn) / inten);
    c += 1 / Math.sqrt(dx * dx + dy * dy);
  }
  c /= 4;
  c = 1.17 - Math.pow(c, 1.4);
  return Math.min(1, Math.pow(Math.abs(c), 8));
}

/**
 * Rasterise the frame loop. Returns textures ready to hand to
 * `SpotLight.map`; the caller owns disposal.
 */
export function makeCausticFrames(size: number): THREE.Texture[] {
  const out: THREE.Texture[] = [];
  const half = size / 2;
  for (let f = 0; f < FRAMES; f++) {
    // 2*pi over the loop keeps the cycle seamless.
    const phase = (f / FRAMES) * Math.PI * 2;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) break;
    const img = ctx.createImageData(size, size);
    const data = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Radial falloff so the projected disc has no hard square edge.
        const rx = (x - half) / half;
        const ry = (y - half) / half;
        const fall = Math.max(0, 1 - Math.sqrt(rx * rx + ry * ry));
        const value = causticAt(x / size, y / size, phase) * fall * fall;
        const byte = Math.round(255 * Math.min(1, value));
        const i = (y * size + x) * 4;
        data[i] = byte;
        data[i + 1] = byte;
        data[i + 2] = byte;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    out.push(tex);
  }
  return out;
}
