import { expectObjectiveGuidance } from './helpers/phoneHud.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdir } from 'node:fs/promises';
import { expect, test } from './helpers/unlocked.js';
import type { ObjectiveStatus, MissionObjectiveDef } from '../../src/game/Mission.js';
import type { ObjectivesPanel } from '../../src/ui/ObjectivesPanel.js';

const shots = '.cache/codex/shots/f-bughunt-7';

for (const layout of [
  { name: 'desktop', width: 1280, height: 720, touch: false },
  { name: 'phone', width: 390, height: 844, touch: true },
]) {
  test.describe(`copy regression ${layout.name}`, () => {
    test.use({
      viewport: { width: layout.width, height: layout.height },
      hasTouch: layout.touch,
      isMobile: layout.touch,
    });

    test('all authored current-objective titles fit at 100% and 150%', async ({ page }) => {
      const indexResponse = await page.request.get('/data/landmarks/index.json');
      expect(indexResponse.ok()).toBe(true);
      const index = (await indexResponse.json()) as { landmarks: string[] };
      const copy = (
        await Promise.all(
          index.landmarks.map(async (id) => {
            const response = await page.request.get(`/data/landmarks/${id}/mission.json`);
            expect(response.ok(), id).toBe(true);
            return ((await response.json()) as { objectives: MissionObjectiveDef[] }).objectives;
          }),
        )
      )
        .flat()
        .sort((a, b) => a.title.length - b.title.length);
      await page.goto(`/?mission=titanic&skipBriefing=1&tier=low${layout.touch ? '&touch=1' : ''}`);
      await page.waitForFunction(() => window.__gameReady === true);
      await expectObjectiveGuidance(page, layout.touch);
      const activeId = await page.evaluate(() => {
        const g = window.__game as { mission: { objectives: ObjectiveStatus[] } };
        const title = document.querySelector('.obj-item.is-current .obj-item-title')!.textContent;
        return g.mission.objectives.find((o) => o.title === title)!.id;
      });
      await mkdir(shots, { recursive: true });

      // Exercise the real HUD component with the authored copy corpus. Keep the
      // live target ID so the router's navigation refresh cannot replace this
      // layout fixture. Mission progression is covered by content-missions.
      for (const scale of [100, 150]) {
        await page.evaluate((uiScale) => {
          const g = window.__game as { save: { save(value: { uiScale: number }): void } };
          g.save.save({ uiScale });
        }, scale);
        // The copy fixture and its measurements are one browser task, so the
        // live router cannot overwrite the fixture between setting and reading
        // it. Every authored title/hint and all original bounds are still checked.
        const samples = await page.evaluate(
          ({ copy, activeId }) => {
            const g = window.__game as {
              mission: { objectives: ObjectiveStatus[] };
              missionRouter: { panel: ObjectivesPanel };
            };
            // Select the fixture's current row explicitly. Live navigation may
            // have changed between scales; copy measurement must not depend on
            // the submarine continuing to favour the same target.
            g.missionRouter.panel.setNav(
              {
                id: activeId,
                name: 'Copy fixture',
                primary: true,
                bearingDeg: 0,
                rangeM: 0,
                depthM: 0,
                relativeDeg: 0,
              },
              false,
            );
            // Objective copy is shown when no scan card owns the instruction.
            // Measure that real presentation state in the same synchronous task.
            const scan = document.querySelector<HTMLElement>('.scan-panel')!;
            const hidden = scan.hidden;
            scan.hidden = true;
            const samples = copy.map((objective) => {
              g.missionRouter.panel.setObjectives(
                g.mission.objectives.map((o) =>
                  o.id === activeId
                    ? {
                        ...o,
                        title: objective.title,
                        hint: objective.hint,
                        primary: objective.primary,
                      }
                    : o,
                ),
              );
              const element = document.querySelector<HTMLElement>(
                '.obj-item.is-current .obj-item-title',
              )!;
              const box = element.getBoundingClientRect();
              const row = element.parentElement!.getBoundingClientRect();
              const optional = element
                .parentElement!.querySelector('.obj-optional')
                ?.getBoundingClientRect();
              return {
                objective,
                title: element.textContent,
                hint: document.querySelector('.obj-hint')!.textContent,
                visible:
                  box.width > 0 &&
                  box.height > 0 &&
                  getComputedStyle(element).visibility === 'visible',
                clipped:
                  element.scrollWidth > element.clientWidth + 1 ||
                  element.scrollHeight > element.clientHeight + 1,
                left: box.left,
                right: box.right,
                rowRight: row.right,
                optionalLeft: optional?.left ?? row.right,
              };
            });
            scan.hidden = hidden;
            return samples;
          },
          { copy, activeId },
        );
        for (const bounds of samples) {
          const objective = bounds.objective;
          expect(bounds.title).toBe(objective.title);
          expect(bounds.hint).toBe(objective.hint);
          expect(bounds.visible, `${scale}%: ${objective.title}`).toBe(true);
          expect(bounds.clipped, `${scale}%: ${objective.title}`).toBe(false);
          expect(bounds.left).toBeGreaterThanOrEqual(0);
          expect(bounds.right).toBeLessThanOrEqual(layout.width);
          expect(bounds.right).toBeLessThanOrEqual(bounds.rowRight);
          expect(bounds.right).toBeLessThanOrEqual(bounds.optionalLeft);
        }
        await expect
          .poll(async () => {
            const panel = (await page.locator('.objectives-panel').boundingBox())!;
            const readouts = (await page.locator('.hud-readouts').boundingBox())!;
            return readouts.y - (panel.y + panel.height);
          })
          .toBeGreaterThanOrEqual(0);
        await page.screenshot({ path: `${shots}/${layout.name}-${scale}.png` });
      }
    });
  });
}
