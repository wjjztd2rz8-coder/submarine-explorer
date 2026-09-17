// Terrain fragment additions, injected into MeshStandardMaterial by
// src/world/TerrainMaterial.ts.
//
// Sections, in order, separated by marker lines:
//   (top)        declarations, prepended to the shader source
//   // @albedo   inserted after #include <map_fragment>
//   // @rough    inserted after #include <roughnessmap_fragment>
//   // @normal   inserted after #include <normal_fragment_begin>
//
// Material model
// --------------
// Three CC0-style seabed materials are blended per pixel and projected
// triplanar-ly from world space, so nothing stretches on a canyon wall and
// nothing tiles visibly on the abyssal plain:
//
//   sediment   the default: fine, soft, slightly warm grey
//   rock       where the surface is steeper than ~25 degrees (basalt / scarp)
//   sand       above ~200 m, where light and currents keep the bed clean
//
// The textures are pure *modulation* (mean luminance uAlbedoGain^-1), so the
// large-scale colour still comes from the depth ramp in Config -- now sampled
// from a 256x1 LUT instead of a per-vertex colour attribute. Dropping that
// attribute saves 12 bytes on every one of the several million vertices and
// lets the ramp be swapped at runtime.

uniform sampler2D tSediment;
uniform sampler2D tRock;
uniform sampler2D tSand;
uniform sampler2D tDetailGrad;
uniform sampler2D tRamp;
uniform float uTexScale;        // metres per texture repeat
uniform float uGradScale;       // metres per detail-gradient repeat
uniform float uNormalStrength;  // 0 = geometry normals only
uniform float uAlbedoGain;
uniform float uCosRockStart;    // cos(steep angle): fully rock at or below
uniform float uCosRockEnd;      // cos(shallow angle): fully sediment at or above
uniform float uSandDeep;        // metres (negative): no sand deeper than this
uniform float uSandShallow;     // metres (negative): all sand above this
uniform float uRampMinDepth;
uniform float uRampSpan;
uniform float uExaggeration;

varying vec3 vTerrainWorldPos;
varying vec3 vTerrainWorldNormal;

vec3 terrainBlendWeights(vec3 n) {
  vec3 w = pow(abs(n), vec3(4.0));
  return w / max(w.x + w.y + w.z, 1e-4);
}

vec3 terrainTriplanar(sampler2D tex, vec3 p, vec3 w, float scale) {
  float s = 1.0 / max(scale, 1e-3);
  vec3 cx = texture2D(tex, p.zy * s).rgb;
  vec3 cy = texture2D(tex, p.xz * s).rgb;
  vec3 cz = texture2D(tex, p.xy * s).rgb;
  return cx * w.x + cy * w.y + cz * w.z;
}

vec3 terrainSrgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}

// @albedo
{
  vec3 wn = normalize(vTerrainWorldNormal);
  vec3 w = terrainBlendWeights(wn);
  float rockT = 1.0 - smoothstep(uCosRockStart, uCosRockEnd, abs(wn.y));
  float depthM = vTerrainWorldPos.y / max(uExaggeration, 1e-3);
  float sandT = smoothstep(uSandDeep, uSandShallow, depthM);

  vec3 sed = terrainTriplanar(tSediment, vTerrainWorldPos, w, uTexScale);
  vec3 rck = terrainTriplanar(tRock, vTerrainWorldPos, w, uTexScale);
  vec3 snd = terrainTriplanar(tSand, vTerrainWorldPos, w, uTexScale);
  vec3 surfaceAlbedo = mix(mix(sed, snd, sandT), rck, rockT) * uAlbedoGain;

  float rampT = clamp((depthM - uRampMinDepth) / max(uRampSpan, 1e-3), 0.0, 1.0);
  vec3 tint = terrainSrgbToLinear(texture2D(tRamp, vec2(rampT, 0.5)).rgb);

  diffuseColor.rgb *= tint * surfaceAlbedo;
}

// @rough
{
  float rockT = 1.0 - smoothstep(uCosRockStart, uCosRockEnd, abs(normalize(vTerrainWorldNormal).y));
  // Wet rock is a touch glossier than settled silt.
  roughnessFactor = mix(0.97, 0.78, rockT);
}

// @normal
{
  vec3 wn = normalize(vTerrainWorldNormal);
  vec3 w = terrainBlendWeights(wn);
  vec2 grad = terrainTriplanar(tDetailGrad, vTerrainWorldPos, w, uGradScale).rg * 2.0 - 1.0;
  float rockT = 1.0 - smoothstep(uCosRockStart, uCosRockEnd, abs(wn.y));
  float strength = uNormalStrength * mix(0.55, 1.0, rockT);
  // The seabed is a height field, so a bump is just an added surface gradient:
  // rescale the normal to the (-dh/dx, 1, -dh/dz) form, add the slope, renormalise.
  vec3 h = wn / max(abs(wn.y), 0.15);
  h.x -= strength * grad.x;
  h.z -= strength * grad.y;
  normal = normalize(mat3(viewMatrix) * normalize(h) * (gl_FrontFacing ? 1.0 : -1.0));
}
