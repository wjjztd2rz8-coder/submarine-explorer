import { BackSide, DoubleSide, Matrix4, Vector4 } from 'three';

// CPU pixel-centre coverage, with homogeneous clipping and a depth buffer.
// Labels let an audit count a subject without counting its empty bounding box.
export function projectCoverage(camera, width, height, entries) {
  camera.updateMatrixWorld(true);
  const depth = new Float64Array(width * height).fill(Infinity);
  const labels = new Uint8Array(width * height);
  const view = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const matrix = new Matrix4();
  const instance = new Matrix4();
  const planes = [
    (p) => p.w + p.x,
    (p) => p.w - p.x,
    (p) => p.w + p.y,
    (p) => p.w - p.y,
    (p) => p.w + p.z,
    (p) => p.w - p.z,
  ];
  const edge = (a, b, x, y) => (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
  const raster = (vertices, side, label) => {
    for (let j = 1; j < vertices.length - 1; j++) {
      const [a, b, c] = [vertices[0], vertices[j], vertices[j + 1]].map((p) => ({
        x: ((p.x / p.w + 1) * width) / 2,
        y: ((1 - p.y / p.w) * height) / 2,
        z: p.z / p.w,
      }));
      const area = edge(a, b, c.x, c.y);
      if (
        Math.abs(area) < 1e-12 ||
        (side !== DoubleSide && (side === BackSide ? area < 0 : area > 0))
      )
        continue;
      const x0 = Math.max(0, Math.ceil(Math.min(a.x, b.x, c.x) - 0.5));
      const x1 = Math.min(width - 1, Math.floor(Math.max(a.x, b.x, c.x) - 0.5));
      const y0 = Math.max(0, Math.ceil(Math.min(a.y, b.y, c.y) - 0.5));
      const y1 = Math.min(height - 1, Math.floor(Math.max(a.y, b.y, c.y) - 0.5));
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          const u = edge(b, c, x + 0.5, y + 0.5) / area,
            v = edge(c, a, x + 0.5, y + 0.5) / area,
            w = 1 - u - v;
          if (u < -1e-10 || v < -1e-10 || w < -1e-10) continue;
          const z = u * a.z + v * b.z + w * c.z,
            k = y * width + x;
          if (z < depth[k]) {
            depth[k] = z;
            labels[k] = label;
          }
        }
    }
  };
  for (const { mesh, label } of entries) {
    mesh.updateWorldMatrix(true, false);
    const geometry = mesh.geometry,
      pos = geometry.getAttribute('position'),
      index = geometry.index;
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (!material.visible) continue;
    for (let n = 0; n < (mesh.isInstancedMesh ? mesh.count : 1); n++) {
      if (mesh.isInstancedMesh) mesh.getMatrixAt(n, instance);
      else instance.identity();
      matrix.copy(view).multiply(mesh.matrixWorld).multiply(instance);
      const projected = Array.from({ length: pos.count }, (_, i) =>
        new Vector4(pos.getX(i), pos.getY(i), pos.getZ(i), 1).applyMatrix4(matrix),
      );
      for (let i = 0; i < (index?.count ?? pos.count); i += 3) {
        let polygon = [0, 1, 2].map((j) => projected[index ? index.getX(i + j) : i + j]);
        for (const distance of planes) {
          if (polygon.every((p) => distance(p) >= 0)) continue;
          const clipped = [];
          for (let j = 0; j < polygon.length; j++) {
            const a = polygon[j],
              b = polygon[(j + 1) % polygon.length],
              da = distance(a),
              db = distance(b);
            if (da >= 0) clipped.push(a);
            if (da >= 0 !== db >= 0) clipped.push(a.clone().lerp(b, da / (da - db)));
          }
          polygon = clipped;
          if (polygon.length < 3) break;
        }
        if (polygon.length >= 3) raster(polygon, material.side, label);
      }
    }
  }
  return { labels, depth };
}

export function coverageFractions(labels, width, height, label = 1) {
  let pixels = 0,
    topPixels = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (labels[y * width + x] === label) {
        pixels++;
        if (y + 0.5 < height / 3) topPixels++;
      }
  return {
    screenFraction: pixels / (width * height),
    topThirdScreenFraction: topPixels / (width * height),
    topThirdFill: topPixels / (width * Math.floor(height / 3 + 0.5)),
    hoodInTopThird: pixels ? topPixels / pixels : 0,
  };
}
