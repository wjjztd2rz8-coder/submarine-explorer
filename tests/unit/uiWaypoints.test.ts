import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { Mission, nextScanObjective, parseMission } from '../../src/game/Mission.js';
import type { PlacedPoi } from '../../src/game/Pois.js';
import { Scanner } from '../../src/game/Scanner.js';
import { GuidanceSlot } from '../../src/ui/GuidanceSlot.js';
import { ObjectivesPanel } from '../../src/ui/ObjectivesPanel.js';
import { Waypoints, waypointReadout } from '../../src/ui/Waypoints.js';

describe('waypoint readout', () => {
  it('reports slant range, signed depth direction and an in-range cue', () => {
    expect(waypointReadout({ x: 0, y: -100, z: 0 }, { x: 0, y: -110, z: -40 }, 50)).toBe(
      '41 m · ↓10 m · IN RANGE',
    );
    expect(waypointReadout({ x: 0, y: -100, z: 0 }, { x: 0, y: -80, z: -100 }, 50)).toBe(
      '102 m · ↑20 m',
    );
  });
});

// The guidance/overlay specs use the same small DOM approach. Layout is incidental here.
class Element extends EventTarget {
  children: Element[] = [];
  parentElement: Element | null = null;
  className = '';
  hidden = false;
  textContent = '';
  title = '';
  dataset: Record<string, string> = {};
  attributes: Record<string, string> = {};
  offsetWidth = 0;
  offsetHeight = 0;
  style = { setProperty() {} };
  classList = {
    contains: (name: string) => this.className.split(' ').includes(name),
    toggle: (name: string, on = !this.classList.contains(name)) => {
      const classes = new Set(this.className.split(' ').filter(Boolean));
      if (on) classes.add(name);
      else classes.delete(name);
      this.className = [...classes].join(' ');
      return on;
    },
  };
  append(...nodes: Element[]) {
    for (const node of nodes) {
      node.parentElement = this;
      this.children.push(node);
    }
  }
  appendChild(node: Element) {
    this.append(node);
    return node;
  }
  replaceChildren(...nodes: Element[]) {
    for (const child of [...this.children]) child.remove();
    this.append(...nodes);
  }
  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }
  remove() {
    if (this.parentElement)
      this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    this.parentElement = null;
  }
}

describe('waypoint objective state', () => {
  const cleanup: Array<() => void> = [];
  beforeEach(() => {
    vi.stubGlobal('document', {
      body: new Element(),
      documentElement: new Element(),
      createElement: () => new Element(),
      createElementNS: () => new Element(),
    });
    vi.stubGlobal('window', { innerWidth: 800, innerHeight: 600 });
  });
  afterEach(() => {
    for (const dispose of cleanup.splice(0).reverse()) dispose();
    vi.unstubAllGlobals();
  });

  function fixture() {
    const pois: PlacedPoi[] = [
      { id: 'a', name: 'First contact', position: new Vector3(0, -110, -40) },
      { id: 'b', name: 'Next contact', position: new Vector3(0, -80, -100) },
    ].map((poi) => ({
      ...poi,
      landmarkId: 'site',
      kind: 'geology',
      primary: true,
      guideEntry: null,
      radius: 50,
      scanSeconds: 1,
      def: { id: poi.id, name: poi.name, lat: 0, lon: 0, kind: 'geology', primary: true },
    }));
    const bus = new EventBus();
    const scanner = new Scanner(DEFAULT_CONFIG.scan, bus);
    scanner.setTargets(pois);
    const mission = new Mission({
      bus,
      def: parseMission(
        {
          spawn: { lat: 0, lon: 0 },
          objectives: pois.map((poi) => ({ id: poi.id, poi: poi.id, primary: true })),
        },
        'site',
      )!,
    });
    mission.resolve(pois.map((poi) => poi.id));
    mission.start('site');
    const view = new Waypoints(scanner);
    // The caller supplies this list once, after discovery readiness.
    view.setPois(pois);
    const slot = new GuidanceSlot();
    const panel = new ObjectivesPanel(document.body);
    cleanup.push(
      () => mission.dispose(),
      () => view.dispose(),
      () => slot.dispose(),
      () => panel.dispose(),
    );
    const position = new Vector3(0, -100, 0);
    const camera = new PerspectiveCamera(60, 4 / 3, 0.1, 1000);
    camera.position.copy(position);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    const root = view.root as unknown as Element;
    const edge = root.children[0];
    const [name, info] = edge.children;
    const marker = (id: string) => root.children.find((node) => node.dataset.poi === id)!;
    const currentIds = () =>
      root.children
        .filter((node) => node.classList.contains('is-current'))
        .map((node) => node.dataset.poi);
    const draw = (objective = nextScanObjective(mission.objectives) ?? null) => {
      scanner.setObjective(objective?.poiId ?? null);
      view.update(
        camera,
        position,
        objective,
        (targetName) => slot.showsName(targetName) || panel.showsTarget(targetName),
      );
    };
    const scan = (poi: PlacedPoi) => {
      scanner.setObjective(poi.id);
      scanner.update(
        poi.scanSeconds,
        position,
        poi.position.clone().sub(position).normalize(),
        true,
      );
    };
    return {
      pois,
      scanner,
      mission,
      view,
      slot,
      panel,
      position,
      edge,
      name,
      info,
      marker,
      currentIds,
      draw,
      scan,
    };
  }

  it('hands the current cue from a completed scan to the next objective, then removes it', () => {
    const f = fixture();
    f.draw();
    expect(f.currentIds()).toEqual(['a']);
    expect(f.marker('a')).toMatchObject({
      hidden: false,
      textContent: '◇',
      attributes: { 'aria-label': 'First contact' },
    });
    expect(f.marker('b').hidden).toBe(true);
    expect(f.edge.hidden).toBe(false);
    expect(f.name).toMatchObject({ hidden: false, textContent: 'First contact' });
    expect(f.info.textContent).toBe('41 m · ↓10 m · IN RANGE');

    f.scan(f.pois[0]);
    expect(f.scanner.isScanned('site', 'a')).toBe(true);
    expect(nextScanObjective(f.mission.objectives)?.poiId).toBe('b');
    // A caller still handing over a scanned objective keeps its edge cue until it advances.
    f.draw(f.mission.objectives[0]);
    expect(f.currentIds()).toEqual([]);
    expect(f.marker('a')).toMatchObject({
      hidden: false,
      textContent: '✓',
      title: 'First contact · scanned this dive',
    });
    expect(f.marker('a').classList.contains('is-scanned')).toBe(true);
    expect(f.edge.hidden).toBe(false);
    expect(f.name.textContent).toBe('First contact');

    f.draw();
    expect(f.currentIds()).toEqual(['b']);
    expect(f.marker('a').classList.contains('is-scanned')).toBe(true);
    expect(f.marker('b')).toMatchObject({
      hidden: false,
      textContent: '◇',
      title: 'Next contact',
      attributes: { 'aria-label': 'Next contact' },
    });
    expect(f.marker('b').classList.contains('is-scanned')).toBe(false);
    expect(f.name).toMatchObject({ hidden: false, textContent: 'Next contact' });
    expect(f.info.textContent).toBe('102 m · ↑20 m');

    f.position.set(0, -80, -60);
    f.draw();
    expect(f.info.textContent).toBe('40 m · ↑0 m · IN RANGE');
    f.scan(f.pois[1]);
    expect(nextScanObjective(f.mission.objectives)).toBeUndefined();
    f.draw();
    expect(f.currentIds()).toEqual([]);
    expect(f.edge.hidden).toBe(true);
    for (const poi of f.pois) {
      expect(f.marker(poi.id)).toMatchObject({ hidden: false, textContent: '✓' });
      expect(f.marker(poi.id).classList.contains('is-scanned')).toBe(true);
    }
  });

  it('restores the current objective after visual hints return without losing scanned markers', () => {
    const f = fixture();
    f.draw();
    f.scan(f.pois[0]);
    f.draw();
    f.view.setVisualHints(false);
    f.draw();
    expect(f.currentIds()).toEqual([]);
    expect(f.edge.hidden).toBe(true);
    expect(f.marker('b').hidden).toBe(true);
    expect(f.marker('a')).toMatchObject({ hidden: false, textContent: '✓' });
    expect(f.marker('a').classList.contains('is-scanned')).toBe(true);

    f.view.setVisualHints(true);
    f.draw();
    expect(f.currentIds()).toEqual(['b']);
    expect(f.marker('b')).toMatchObject({ hidden: false, textContent: '◇' });
    expect(f.marker('a')).toMatchObject({ hidden: false, textContent: '✓' });
    expect(f.marker('a').classList.contains('is-scanned')).toBe(true);
    expect(f.edge.hidden).toBe(false);
    expect(f.name).toMatchObject({ hidden: false, textContent: 'Next contact' });
    expect(f.info.textContent).toBe('102 m · ↑20 m');
  });

  it.each(['guidance slot', 'mission panel'] as const)(
    'omits only the redundant name while the %s owns the current target',
    (owner) => {
      const f = fixture();
      const ownName = (poi: PlacedPoi | null) => {
        if (owner === 'guidance slot') {
          f.slot.offer(
            'objective',
            'objective',
            poi ? { kicker: 'NEXT', text: poi.name, tone: 'cyan' } : null,
          );
        } else {
          f.panel.setNav(
            poi
              ? {
                  id: poi.id,
                  name: poi.name,
                  primary: true,
                  bearingDeg: 0,
                  depthM: -poi.position.y,
                  relativeDeg: 0,
                }
              : null,
            false,
          );
        }
      };
      f.draw();
      f.scan(f.pois[0]);
      ownName(f.pois[0]);
      f.draw();
      expect(f.name).toMatchObject({ hidden: false, textContent: 'Next contact' });
      ownName(f.pois[1]);
      f.draw();
      expect(f.name).toMatchObject({ hidden: true, textContent: 'Next contact' });
      expect(f.edge.hidden).toBe(false);
      expect(f.info).toMatchObject({ hidden: false, textContent: '102 m · ↑20 m' });
      expect(f.currentIds()).toEqual(['b']);
      expect(f.marker('a')).toMatchObject({ hidden: false, textContent: '✓' });
      ownName(null);
      f.draw();
      expect(f.name).toMatchObject({ hidden: false, textContent: 'Next contact' });
      expect(f.edge.hidden).toBe(false);
      expect(f.info).toMatchObject({ hidden: false, textContent: '102 m · ↑20 m' });
    },
  );

  it('reads resetDive state on the next update without reviving an old current cue', () => {
    const f = fixture();
    f.draw();
    f.scan(f.pois[0]);
    f.draw();
    expect(f.marker('a').classList.contains('is-scanned')).toBe(true);
    f.scanner.resetDive();
    f.draw();
    expect(f.currentIds()).toEqual(['b']);
    expect(f.marker('a')).toMatchObject({ hidden: true, textContent: '◇', title: 'First contact' });
    expect(f.marker('b')).toMatchObject({ hidden: false, textContent: '◇' });
    for (const poi of f.pois) expect(f.marker(poi.id).classList.contains('is-scanned')).toBe(false);
    expect(f.name).toMatchObject({ hidden: false, textContent: 'Next contact' });
    expect(f.info.textContent).toBe('102 m · ↑20 m');
    f.draw(null);
    expect(f.currentIds()).toEqual([]);
    expect(f.edge.hidden).toBe(true);
    expect(f.marker('a').hidden).toBe(true);
    expect(f.marker('b').hidden).toBe(true);
  });
});
