// Terrain vertex additions, injected into MeshStandardMaterial by
// src/world/TerrainMaterial.ts.
//
// The file has two sections. Everything before the `// @body` marker is
// prepended to the shader source (declarations); everything after it is
// inserted immediately after `#include <begin_vertex>`.
//
// We only need the world position and world normal in the fragment shader: the
// terrain material is triplanar, so it projects textures from world space and
// has no use for UVs at all (which is why the mesh carries no uv attribute).

varying vec3 vTerrainWorldPos;
varying vec3 vTerrainWorldNormal;

// @body
vTerrainWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
vTerrainWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
