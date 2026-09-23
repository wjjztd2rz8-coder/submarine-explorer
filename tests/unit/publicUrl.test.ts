import { describe, expect, it } from 'vitest';
import { publicUrl } from '../../src/util/publicUrl.js';

describe('publicUrl', () => {
  it('resolves public assets under root and project bases', () => {
    expect(publicUrl('/data/tiles', '/')).toBe('/data/tiles');
    expect(publicUrl('/data/tiles', '/submarine-explorer/')).toBe('/submarine-explorer/data/tiles');
    expect(publicUrl('/assets/models/rock_09.glb', '/submarine-explorer/')).toBe(
      '/submarine-explorer/assets/models/rock_09.glb',
    );
    expect(publicUrl('/assets/globe/world.jpg', './')).toBe('./assets/globe/world.jpg');
  });
});
