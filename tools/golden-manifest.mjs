/** The manifest and contact sheet share exactly the same capture evidence. */
export function goldenFilename(site, layout, n, mode) {
  return `${site}${layout === 'desktop' ? '' : `-${layout}`}-${n}${mode === 'mission' ? '-mission' : ''}.png`;
}

export function goldenManifest({ base, stamp, provenance, options, jobs, failures, captures }) {
  const { mode, tier, layouts } = options;
  const saved = new Set(captures.map(({ filename }) => filename));
  // A recorded failure for this exact output already explains why it is absent.
  const reported = new Set(failures.map(({ filename }) => filename));
  const missing = jobs.flatMap(({ hero: [id, , slug = id], layout, mode: jobMode, frames }) =>
    frames
      .map((n) => goldenFilename(slug, layout.name, n, jobMode))
      .filter((filename) => !saved.has(filename) && !reported.has(filename))
      .map((filename) => ({ stage: 'capture coverage', message: `Missing capture: ${filename}` })),
  );
  failures = [...failures, ...missing];
  return {
    base,
    stamp,
    ...provenance,
    mode,
    tier,
    layouts,
    plannedHeroes: jobs
      .filter((j) => j.mode === 'free-dive' && j.layout.name === layouts[0].name)
      .map((j) => j.hero),
    plannedMissions: [...new Set(jobs.filter((j) => j.mode === 'mission').map((j) => j.hero[0]))],
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
</style><h1>Golden shots · ${stamp} UTC</h1><p>${failures.length ? `INCOMPLETE: ${failures.length} failure(s). ` : ''}${tier[0].toUpperCase() + tier.slice(1)} tier · ${layouts.map((l) => `${l.name} ${l.width} × ${l.height}`).join(', ')} · ${mode} · SHA ${provenance.sha ?? 'unavailable'}${provenance.dirty === false ? ' (clean tree)' : provenance.dirty ? ' (dirty)' : ''} · build ${provenance.buildMode ?? 'unavailable'} · fresh Arcade profile, life seed 42, dynamic resolution off. ${mode === 'mission' ? 'Mission: 1: first loaded frame; 2: +10 s of mission time.' : 'Free dive: 1: spawn; 2–3: approach and detail (ranges below).' + (mode === 'all' ? ' Mission: first loaded frame, once per site and layout.' : '')} <a href="poses.json">Pose manifest and failures</a></p>
<main>${captures.map(({ filename, site, layout, mode, sha, range, timeS }) => `<figure><a href="${filename}"><img loading="lazy" src="${filename}" alt="${site}, ${layout}, ${mode}, ${timeS === null ? (range === null ? 'default spawn' : `${range} m approach`) : `+${timeS} s`}"></a><figcaption>${site} · ${layout} · ${mode} · SHA ${sha}<br>${filename}</figcaption></figure>`).join('\n')}</main></html>`;
}
