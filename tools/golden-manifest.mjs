/** The manifest and contact sheet share exactly the same capture evidence. */
export function goldenManifest({ base, stamp, provenance, options, heroes, failures, captures }) {
  const { mode, tier, layouts } = options;
  return {
    base,
    stamp,
    ...provenance,
    mode,
    tier,
    layouts,
    plannedHeroes: mode === 'free-dive' ? heroes : [],
    plannedMissions: mode === 'mission' ? heroes.map(([id]) => id) : [],
    complete: failures.length === 0,
    failures,
    captures,
  };
}

export function goldenContactSheet(manifest) {
  const { stamp, mode, tier, layouts, failures, captures } = manifest;
  const provenance = manifest;
  return `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Golden shots ${stamp}</title><style>
body{margin:24px;background:#081522;color:#e6f0f7;font:16px system-ui}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}figure{margin:0}img{width:100%;height:auto}a{color:inherit}figcaption{padding:8px 0}@media(max-width:800px){main{grid-template-columns:1fr}}
</style><h1>Golden shots · ${stamp} UTC</h1><p>${failures.length ? `INCOMPLETE: ${failures.length} failure(s). ` : ''}${tier[0].toUpperCase() + tier.slice(1)} tier · ${layouts.map((l) => `${l.name} ${l.width} × ${l.height}`).join(', ')} · ${mode} · SHA ${provenance.sha ?? 'unavailable'}${provenance.dirty ? ' (dirty)' : ''} · build ${provenance.buildMode ?? 'unavailable'} · fresh Arcade profile, life seed 42, dynamic resolution off. ${mode === 'mission' ? '1: first loaded mission frame; 2: +10 s of mission time.' : '1: spawn; 2–3: approach and detail (ranges below).'} <a href="poses.json">Pose manifest and failures</a></p>
<main>${captures.map(({ filename, site, layout, mode, sha, range, timeS }) => `<figure><a href="${filename}"><img loading="lazy" src="${filename}" alt="${site}, ${layout}, ${mode}, ${timeS === null ? (range === null ? 'default spawn' : `${range} m approach`) : `+${timeS} s`}"></a><figcaption>${site} · ${layout} · ${mode} · SHA ${sha}<br>${filename}</figcaption></figure>`).join('\n')}</main></html>`;
}
