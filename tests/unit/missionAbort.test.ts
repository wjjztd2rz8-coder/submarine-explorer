/** Fix S: crush depth -> `Mission.abort('crush')` (plan/DECISIONS.md failure model). */

import { describe, expect, it } from 'vitest';
import { EventBus } from '../../src/core/EventBus.js';
import { Mission, parseMission } from '../../src/game/Mission.js';
import titanicMission from '../../data/landmarks/titanic/mission.json';

const quiet = (): void => {};
function make(): { m: Mission; bus: EventBus } {
  const def = parseMission(titanicMission, 'titanic', quiet);
  if (!def) throw new Error('titanic mission.json did not parse');
  const bus = new EventBus();
  return { m: new Mission({ def, bus, completeDelayS: 3, warn: quiet }), bus };
}

describe('Mission.abort', () => {
  it('a running mission aborts, stops its clock and ignores later scans', () => {
    const { m, bus } = make();
    const seen: unknown[] = [];
    bus.on('mission:aborted', (p) => seen.push(p));
    m.start('titanic');
    m.update(12.5);
    m.abort('crush');
    expect(m.state).toBe('aborted');
    expect(seen).toEqual([{ missionId: 'titanic', reason: 'crush' }]);
    expect(m.durationS).toBe(12.5);
    m.update(5);
    expect(m.elapsedS).toBe(12.5);
    const poi = m.objectives[0]!.poiId;
    bus.emit('scan:complete', { poiId: poi, landmarkId: 'titanic', firstTime: true });
    expect(m.objectives[0]!.complete).toBe(false);
    expect(m.emitted.map((e) => e.name)).toEqual(['mission:started', 'mission:aborted']);
  });

  it('only a running (or completing) mission can abort; restart clears it', () => {
    const { m } = make();
    m.abort('crush');
    expect(m.state).toBe('briefing');
    m.start('titanic');
    m.abort('crush');
    m.abort('crush');
    expect(m.emitted.filter((e) => e.name === 'mission:aborted')).toHaveLength(1);
    m.restart();
    expect(m.state).toBe('briefing');
    expect(m.durationS).toBeNull();
  });
});
