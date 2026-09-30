// Terrain fragment additions, injected into MeshStandardMaterial by
// src/world/TerrainMaterial.ts.
//
// Sections, in order, separated by marker lines:
//   (top)        declarations, prepended to the shader source
//   // @albedo   inserted after #include <map_fragment>; computes EVERYTHING
//                (weights, albedo, roughness, perturbed normal) at main() scope
//   // @rough    inserted after #include <roughnessmap_fragment>
//   // @normal   inserted after #include <normal_fragment_begin>
//
// Material model (F1-TERRAIN)
// ---------------------------
// Three texture slots, each filled per site by a biome (TerrainBiome.ts) with one
// of five CC0 PBR sets and a mean colour:
//   A  the primary soft bottom          (weight 1 - rock - patch)
//   B  patches that break A up          (macro noise, biome `patch` coverage)
//   C  hard substrate on slopes/crests  (slope, cavity, biome `rockBias`)
// Every slot is projected triplanar from world space; projections whose blend
// weight is below 2 % are skipped (on the flat bed that is two of three), so a
// flat pixel costs one albedo + one normal/roughness fetch per active slot.
//
// Albedo textures are luminance patterns with mean sRGB 0.5 (linear ~0.214), so
// `colour * tex * TERRAIN_ALBEDO_GAIN` keeps the biome colour as the mean albedo.
// Normal textures pack tangent normal x/y in R/G and roughness in B.
//
// On top of the maps, analytic procedural detail that needs no texture:
//   - macro brightness/hue variation at 55 m and 13 m so no repeat shows
//   - a second, larger-scale sample of slot A multiplied in (texture break-up)
//   - current ripples on flat bed, bioturbation mounds (normal only)
//   - cavity darkening from the baked per-vertex concavity, and staining
// Detail normals fade with distance from the camera (uFade*), so far terrain
// falls back to the smooth geometric normal and never shimmers.

uniform sampler2D tAlbA;
uniform sampler2D tNrmA;
uniform sampler2D tAlbB;
uniform sampler2D tNrmB;
uniform sampler2D tAlbC;
uniform sampler2D tNrmC;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
uniform vec3 uStain;
uniform float uStainAmount;
uniform float uPatch;
uniform float uRipple;
uniform float uRippleLen;
uniform vec2 uRippleDir;
uniform float uBurrow;
uniform float uRockBias;
uniform float uTexScale;        // metres per albedo repeat
uniform float uMacroScale;      // metres, largest colour variation
uniform float uNormalStrength;  // texture normal gain
uniform vec2 uFadeNormal;       // near/far metres for texture normals
uniform vec2 uFadeRipple;       // near/far metres for ripples
uniform vec2 uFadeBurrow;       // near/far metres for bioturbation
uniform vec3 uContrast;         // pattern contrast for slots A, B, C
uniform float uRockLo;          // 1 - cos(slope) where rock starts
uniform float uRockHi;          // ... and where it is complete
uniform float uExaggeration;

varying vec3 vTerrainWorldPos;
varying vec3 vTerrainWorldNormal;
varying float vCavity;

const float TERRAIN_ALBEDO_GAIN = 4.6;

vec3 terrainBlendWeights(vec3 n) {
  vec3 w = pow(abs(n), vec3(4.0));
  return w / max(w.x + w.y + w.z, 1e-4);
}

float terrainHash(vec2 i) {
  // PCG2D: an XOR-only integer hash leaves lattice-aligned structure.
  uvec2 v = uvec2(ivec2(i)) * 1664525u + 1013904223u;
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v ^= v >> 16u;
  v.x += v.y * 1664525u;
  v.y += v.x * 1664525u;
  v ^= v >> 16u;
  return float(v.x >> 8u) * (1.0 / 16777216.0);
}

// Value noise: x = value in 0..1, yz = analytic derivative.
vec3 terrainNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 u = f * f * (3.0 - 2.0 * f);
  vec2 du = 6.0 * f * (1.0 - f);
  float a = terrainHash(i);
  float b = terrainHash(i + vec2(1.0, 0.0));
  float c = terrainHash(i + vec2(0.0, 1.0));
  float d = terrainHash(i + vec2(1.0, 1.0));
  float k = a - b - c + d;
  float v = a + (b - a) * u.x + (c - a) * u.y + k * u.x * u.y;
  vec2 g = du * vec2((b - a) + k * u.y, (c - a) + k * u.x);
  return vec3(v, g);
}

// Scattered round bumps and pits (bioturbation): one per lattice cell at a random
// point, a smooth (1 - r^2)^2 profile, so no lattice direction shows (plain value
// noise gradients do). Returns height in x and its slope (d/dx, d/dz) in yz.
vec3 terrainBumps(vec2 p) {
  vec2 i = floor(p);
  vec3 acc = vec3(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 c = i + vec2(float(x), float(y));
      float h1 = terrainHash(c);
      float h2 = terrainHash(c + 17.31);
      float h3 = terrainHash(c + 71.7);
      if (h3 < 0.42) continue;                       // not every cell has one
      vec2 centre = c + 0.2 + 0.6 * vec2(h1, h2);
      float r = 0.32 + 0.22 * terrainHash(c + 5.5);
      vec2 d = p - centre;
      float q = 1.0 - dot(d, d) / (r * r);
      if (q <= 0.0) continue;
      float amp = h3 > 0.85 ? -0.7 : 1.0;            // some are pits
      acc.x += amp * q * q;
      acc.yz += amp * (-4.0 * q / (r * r)) * d;
    }
  }
  return acc;
}

// Stretch a texture pattern (mean 1 after the gain) about its mean.
vec3 terrainContrast(vec3 s, float c) {
  return max(vec3(1.0) + (s * TERRAIN_ALBEDO_GAIN - 1.0) * c, vec3(0.06));
}

// Triplanar albedo pattern (linear, mean ~0.214). `brk` multiplies in a second,
// larger and rotated sample so the repeat never reads.
vec3 terrainAlbedo(sampler2D t, vec3 p, vec3 w, float s, bool brk) {
  vec3 c = vec3(0.0);
  if (w.y > 0.02) {
    vec2 uv = p.xz * s;
    vec3 a = texture2D(t, uv).rgb;
#ifdef TERRAIN_BREAKUP
    if (brk) {
      vec2 uv2 = vec2(uv.x * 0.83 - uv.y * 0.55, uv.x * 0.55 + uv.y * 0.83) * 0.23 + vec2(0.37, 0.71);
      float b = texture2D(t, uv2).g * TERRAIN_ALBEDO_GAIN;
      a *= mix(1.0, b, 0.55);
    }
#endif
    c += a * w.y;
  }
  if (w.x > 0.02) c += texture2D(t, p.zy * s).rgb * w.x;
  if (w.z > 0.02) c += texture2D(t, p.xy * s).rgb * w.z;
  return c;
}

// Triplanar normal/roughness: xyz = weighted UDN-blended world normal
// (unnormalised), w = weighted roughness.
vec4 terrainNormalRough(sampler2D t, vec3 p, vec3 w, float s, vec3 wn, float k) {
  vec3 n = vec3(0.0);
  float r = 0.0;
  if (w.y > 0.02) {
    vec3 tx = texture2D(t, p.xz * s).rgb;
    vec2 d = (tx.rg * 2.0 - 1.0) * k;
    n += vec3(wn.x + d.x, wn.y, wn.z + d.y) * w.y;
    r += tx.b * w.y;
  }
  if (w.x > 0.02) {
    vec3 tx = texture2D(t, p.zy * s).rgb;
    vec2 d = (tx.rg * 2.0 - 1.0) * k;
    n += vec3(wn.x, wn.y + d.y, wn.z + d.x) * w.x;
    r += tx.b * w.x;
  }
  if (w.z > 0.02) {
    vec3 tx = texture2D(t, p.xy * s).rgb;
    vec2 d = (tx.rg * 2.0 - 1.0) * k;
    n += vec3(wn.x + d.x, wn.y + d.y, wn.z) * w.z;
    r += tx.b * w.z;
  }
  return vec4(n, r);
}

// @albedo
vec3 terrWorldN = normalize(vTerrainWorldNormal);
float terrRough = 0.92;
{
  vec3 wn = terrWorldN;
  vec3 bw = terrainBlendWeights(wn);
  vec3 P = vTerrainWorldPos;
  float dist = length(vViewPosition);
  float texS = 1.0 / uTexScale;

  // --- macro fields -------------------------------------------------------
  vec3 m1 = terrainNoise(P.xz / uMacroScale);
  float m2 = terrainNoise(P.xz / (uMacroScale * 0.23) + 9.0).x;
  float macro = m1.x * 0.6 + m2 * 0.4;
  float cav = clamp(vCavity * 2.0 - 1.0, -1.0, 1.0); // + hollow, - crest

  // --- slot weights -------------------------------------------------------
  float sl = 1.0 - abs(wn.y);
  float rockT = smoothstep(uRockLo, uRockHi, sl - 0.05 * cav - uRockBias * 0.06);
  float thr = mix(0.78, 0.34, uPatch);
  float patchT = smoothstep(thr - 0.07, thr + 0.07, macro) * (1.0 - rockT);
  float wA = (1.0 - rockT) * (1.0 - patchT);
  float wB = patchT;
  float wC = rockT;

  // --- albedo -------------------------------------------------------------
  vec3 alb = vec3(0.0);
  float lum = 1.0;
  if (wA > 0.02) {
    vec3 s = terrainAlbedo(tAlbA, P, bw, texS, true);
    vec3 g = terrainContrast(s, uContrast.x);
    lum = g.g;
    alb += uColA * g * wA;
  }
  if (wB > 0.02) alb += uColB * terrainContrast(terrainAlbedo(tAlbB, P, bw, texS * 0.8, false), uContrast.y) * wB;
  if (wC > 0.02) alb += uColC * terrainContrast(terrainAlbedo(tAlbC, P, bw, texS * 1.15, false), uContrast.z) * wC;
  alb /= max(wA * step(0.02, wA) + wB * step(0.02, wB) + wC * step(0.02, wC), 0.05);

  // --- normals and roughness ---------------------------------------------
  vec3 nAcc = wn * 0.0;
  float rAcc = 0.0;
  float wSum = 0.0;
#ifdef TERRAIN_PBR_NORMALS
  float nFade = 1.0 - smoothstep(uFadeNormal.x, uFadeNormal.y, dist);
  float k = uNormalStrength * nFade;
  if (wA > 0.02) {
    vec4 r = terrainNormalRough(tNrmA, P, bw, texS, wn, k);
    nAcc += r.xyz * wA; rAcc += r.w * wA; wSum += wA;
  }
  if (wB > 0.02) {
    vec4 r = terrainNormalRough(tNrmB, P, bw, texS * 0.8, wn, k);
    nAcc += r.xyz * wB; rAcc += r.w * wB; wSum += wB;
  }
  if (wC > 0.02) {
    vec4 r = terrainNormalRough(tNrmC, P, bw, texS * 1.15, wn, k * 1.2);
    nAcc += r.xyz * wC; rAcc += r.w * wC; wSum += wC;
  }
  nAcc /= max(wSum, 0.05);
  terrRough = clamp(rAcc / max(wSum, 0.05), 0.4, 1.0);
#else
  nAcc = wn;
  terrRough = mix(0.93, 0.8, wC);
#endif

  // --- near-field: ripples, bioturbation ---------------------------------
  float flatT = 1.0 - smoothstep(0.003, 0.02, sl);     // 1 on the flat bed
  vec2 slope = vec2(0.0);
  float rip = 0.0;
  float rFade = 1.0 - smoothstep(uFadeRipple.x, uFadeRipple.y, dist);
  if (uRipple > 0.001 && rFade > 0.01 && flatT > 0.01) {
    float warp = (m2 - 0.5) * 3.2 + (terrainNoise(P.xz / 1.9).x - 0.5) * 0.8;
    float ph = (dot(P.xz, uRippleDir) / uRippleLen + warp) * 6.2832;
    ph += 0.55 * sin(ph);                              // stoss/lee asymmetry
    float mask = smoothstep(0.38, 0.62, macro * 0.7 + terrainNoise(P.xz / 8.0 + 3.0).x * 0.3);
    mask *= flatT * uRipple * (0.5 + 0.5 * wB + 0.5 * (1.0 - wC));
    slope += uRippleDir * cos(ph) * 0.34 * mask * rFade;
    rip = sin(ph) * mask * rFade;
  }
  float bFade = 1.0 - smoothstep(uFadeBurrow.x, uFadeBurrow.y, dist);
  float burrowShade = 0.0;
  if (uBurrow > 0.001 && bFade > 0.01 && flatT > 0.01) {
    vec3 b1 = terrainBumps(P.xz / 1.4 + 11.0);         // ~0.6 m mounds and pits
    vec2 g1 = b1.yz / 1.4;
    float t1 = b1.x;
    float bm = flatT * uBurrow * bFade;
    slope += g1 * 0.16 * bm;
    burrowShade = t1 * 0.12 * bm;
  }
  nAcc.xz += slope;
  terrWorldN = normalize(nAcc);

  // --- shading modulations ----------------------------------------------
  alb *= 1.0 + burrowShade + rip * 0.09;
  alb *= 1.0 - 0.38 * max(cav, 0.0) + 0.08 * max(-cav, 0.0);
  alb *= mix(0.74, 1.26, m1.x) * mix(0.9, 1.1, m2);
  alb *= mix(vec3(1.04, 1.0, 0.95), vec3(0.96, 1.0, 1.05), m2);
  float st = smoothstep(0.5, 0.78, terrainNoise(P.xz / 3.3 + 21.0).x * 0.55 + macro * 0.45);
  st *= uStainAmount * (0.55 + 0.9 * rockT + 0.5 * max(cav, 0.0));
  alb = mix(alb, uStain * lum, clamp(st, 0.0, 0.85));

  diffuseColor.rgb *= alb;
}

// @rough
roughnessFactor = terrRough;

// @normal
normal = normalize(mat3(viewMatrix) * terrWorldN * (gl_FrontFacing ? 1.0 : -1.0));
