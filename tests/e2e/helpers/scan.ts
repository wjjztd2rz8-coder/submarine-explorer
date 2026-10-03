import type { Page } from '@playwright/test';
import type { Vector3 } from 'three';
import type { Discovery } from '../../../src/game/Discovery.js';
import type { Rov } from '../../../src/rov/Rov.js';

/** Advance only discovery time: rendering/vehicle/wildlife speed must not decide a scan test. */
async function stepScan(page: Page, seconds: number | null, id?: string): Promise<void> {
  await page.evaluate(
    ({ seconds, id }) => {
      const g = window.__game as unknown as {
        appState: string;
        input: { sample(): { scan: boolean } };
        sub: { position: Vector3; getForward(): Vector3 };
        rov: Rov;
        config: { rov: { scanRangeFactor: number } };
        photoMode: { active: boolean };
        globe: { isOpen: boolean };
        settings: { isOpen: boolean };
        missionRouter: { frozen: boolean; debriefOpen: boolean } | null;
        discovery: Discovery;
      };
      if (
        g.appState !== 'dive' ||
        g.photoMode.active ||
        g.globe.isOpen ||
        g.settings.isOpen ||
        g.missionRouter?.frozen ||
        g.missionRouter?.debriefOpen ||
        g.discovery.guide.isOpen ||
        g.discovery.debrief.isOpen
      )
        throw new Error('Cannot advance a scan while the dive is frozen');
      const held = g.input.sample().scan;
      if (!held) throw new Error('The real scan control must be held before advancing scan time');
      const pilot = g.rov.deployed ? g.rov : g.sub;
      const forward = g.rov.deployed ? g.rov.forward : g.sub.getForward();
      const discovery = g.discovery;
      const scanner = discovery.scanner;
      // Match scan.rovRange/scan.rovRangeRestore without stepping the vehicle.
      const radii = discovery.pois.map((p) => p.radius);
      try {
        if (g.rov.deployed)
          discovery.pois.forEach((p) => (p.radius *= g.config.rov.scanRangeFactor));
        // Refresh candidate geometry from the actual pose, not a stale rendered frame.
        const update = (dt: number): void =>
          discovery.update(dt, 0, pilot.position, forward, { scan: held }, undefined, 0);
        update(0);
        const candidateId = scanner.view.candidateId;
        const before = scanner.view.completed;
        let duration = seconds;
        if (duration === null) {
          // A normal rendered frame may have finished the partial scan between calls.
          if (id !== undefined && scanner.view.lastCompleteId === id) return;
          if (!candidateId || (id !== undefined && candidateId !== id))
            throw new Error(`Expected scan candidate ${id ?? 'in range'}, got ${candidateId}`);
          const target = [
            ...scanner.getTargets(),
            ...scanner.getExtraTargets(),
            ...scanner.getSupplementalTargets(),
          ].find((t) => t.id === candidateId)!;
          duration = target.scanSeconds + 1 / 60;
        }
        for (let remaining = duration; remaining > 1e-9; remaining -= 1 / 60) {
          update(Math.min(remaining, 1 / 60));
          if (seconds === null && scanner.view.completed > before) break;
        }
        if (
          seconds === null &&
          (scanner.view.completed !== before + 1 || scanner.view.lastCompleteId !== candidateId)
        )
          throw new Error(
            `Scan did not complete for ${candidateId}: ${JSON.stringify(scanner.view)}`,
          );
      } finally {
        discovery.pois.forEach((p, i) => (p.radius = radii[i]!));
      }
    },
    { seconds, id },
  );
}

/** Uses the real held keyboard/touch input, geometry, recorder and event subscribers. */
export async function completeScan(page: Page, id?: string): Promise<void> {
  await stepScan(page, null, id);
}

/** Partial progress and holding after completion also need simulation seconds, not wall time. */
export async function advanceScan(page: Page, seconds: number): Promise<void> {
  await stepScan(page, seconds);
}

export async function scanWithKeyboard(page: Page, id?: string): Promise<void> {
  await page.keyboard.down('g');
  try {
    await completeScan(page, id);
  } finally {
    await page.keyboard.up('g');
  }
}
