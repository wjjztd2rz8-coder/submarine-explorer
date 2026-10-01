// Terrain vertex additions, injected into MeshStandardMaterial by
// src/world/TerrainMaterial.ts.
//
// The file has two sections. Everything before the `// @body` marker is
// prepended to the shader source (declarations); everything after it is
// inserted immediately after `#include <begin_vertex>`.
//
// The fragment shader needs the world position and world normal (the material
// is triplanar, so it projects textures from world space and the mesh carries no
// uv attribute) and `aCavity`, a per-vertex concavity value baked by
// TerrainChunk (0.5 flat, > 0.5 hollow, < 0.5 crest).

attribute float aCavity;
varying vec3 vTerrainWorldPos;
varying vec3 vTerrainWorldNormal;
varying float vCavity;

// @body
vTerrainWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
vTerrainWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
vCavity = aCavity;
