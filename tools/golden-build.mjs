import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);

/** Stamp the served document, so a stale preview cannot claim the current checkout. */
export function goldenBuild() {
  let config;
  return {
    name: 'submarine:golden-build',
    configResolved(value) {
      config = value;
    },
    async transformIndexHtml() {
      const git = async (args) =>
        (await run('git', args, { cwd: config.root, encoding: 'utf8' })).stdout.trim();
      return [
        { tag: 'meta', attrs: { name: 'golden-sha', content: await git(['rev-parse', 'HEAD']) } },
        {
          tag: 'meta',
          attrs: {
            name: 'golden-dirty',
            content: String(
              Boolean(await git(['status', '--porcelain', '--untracked-files=normal'])),
            ),
          },
        },
        { tag: 'meta', attrs: { name: 'golden-build-mode', content: config.mode } },
      ];
    },
  };
}

export function readGoldenBuild(html) {
  const field = (name) =>
    html.match(new RegExp(`<meta name="golden-${name}" content="([^"]*)"`))?.[1];
  const sha = field('sha');
  const dirty = field('dirty');
  const buildMode = field('build-mode');
  if (!/^[a-f0-9]{40,64}$/.test(sha ?? '') || !['true', 'false'].includes(dirty) || !buildMode)
    throw new Error('Missing or invalid golden build provenance; rebuild or restart Vite.');
  return { sha, dirty: dirty === 'true', buildMode };
}
