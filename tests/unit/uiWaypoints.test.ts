import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { Mission, nextScanObjective, parseMission } from '../../src/game/Mission.js';
import type { PlacedPoi } from '../../src/game/Pois.js';
import { Scanner } from '../../src/game/Scanner.js';
import { clampWaypointLabel, Waypoints } from '../../src/ui/Waypoints.js';

describe('waypoint label placement', () => {
  const viewport = { width: 844, height: 390 };
  const size = { width: 240, height: 80 };
  const gap = 8;
  const occupied = [
    { left: 12, top: 12, right: 132, bottom: 148 },
    { left: 140, top: 12, right: 574, bottom: 170 },
    { left: 582, top: 12, right: 832, bottom: 94 },
    { left: 580, top: 202, right: 832, bottom: 374 },
    { left: 16, top: 258, right: 128, bottom: 374 },
  ];

  it.each([
    { x: -150, y: 100 },
    { x: 800, y: 210 },
    { x: 60, y: 120 },
    { x: 320, y: -80 },
    { x: 320, y: 380 },
  ])('keeps the whole current label clear at $x, $y', (preferred) => {
    const result = clampWaypointLabel(preferred, size, viewport, occupied, gap)!;
    expect(result).not.toBeNull();
    expect(result.x).toBeGreaterThanOrEqual(gap);
    expect(result.y).toBeGreaterThanOrEqual(gap);
    expect(result.x + size.width).toBeLessThanOrEqual(viewport.width - gap);
    expect(result.y + size.height).toBeLessThanOrEqual(viewport.height - gap);
    for (const r of occupied)
      expect(
        result.x < r.right + gap &&
          result.x + size.width + gap > r.left &&
          result.y < r.bottom + gap &&
          result.y + size.height + gap > r.top,
      ).toBe(false);
  });

  it('preserves a clear projection and clamps a newly wider label at the viewport edge', () => {
    expect(clampWaypointLabel({ x: 200, y: 200 }, size, viewport, [], gap)).toEqual({
      x: 200,
      y: 200,
    });
    expect(
      clampWaypointLabel({ x: 780, y: 200 }, { width: 300, height: 100 }, viewport, [], gap),
    ).toEqual({ x: 536, y: 200 });
  });

  it('fits wrapped portrait copy between the top HUD and the touch dock', () => {
    const result = clampWaypointLabel(
      { x: 380, y: 140 },
      { width: 156, height: 96 },
      { width: 390, height: 844 },
      [
        { left: 0, top: 0, right: 390, bottom: 220 },
        { left: 0, top: 660, right: 390, bottom: 844 },
      ],
      gap,
    )!;
    expect(result).toEqual({ x: 226, y: 228 });
  });

  it('yields when the map owns the viewport or wrapped copy cannot fit', () => {
    expect(
      clampWaypointLabel(
        { x: 0, y: 0 },
        size,
        viewport,
        [{ left: 0, top: 0, right: 844, bottom: 390 }],
        gap,
      ),
    ).toBeNull();
    expect(
      clampWaypointLabel({ x: 0, y: 0 }, { width: 844, height: 400 }, viewport, [], gap),
    ).toBeNull();
  });
});

// The guidance/overlay specs use the same small DOM approach. Layout is incidental here.
class Element extends EventTarget {
  children: Element[] = [];
  parentElement: Element | null = null;
  className = '';
  private hiddenValue = false;
  get hidden() {
    return this.hiddenValue;
  }
  set hidden(value: boolean) {
    this.hiddenValue = value;
  }
  private textValue = '';
  get textContent() {
    return this.textValue;
  }
  set textContent(value: string) {
    this.textValue = value;
  }
  title = '';
  dataset: Record<string, string> = {};
  attributes: Record<string, string> = {};
  offsetWidth = 0;
  offsetHeight = 0;
  getBoundingClientRect() {
    return { width: this.offsetWidth, height: this.offsetHeight };
  }
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
  getAttribute(name: string) {
    return this.attributes[name] ?? null;
  }
  checkVisibility() {
    return !this.hidden;
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
      querySelectorAll: () => [],
    });
    vi.stubGlobal(
      'window',
      Object.assign(new EventTarget(), { innerWidth: 800, innerHeight: 600 }),
    );
    vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '8px' }));
  });
  afterEach(() => {
    for (const dispose of cleanup.splice(0).reverse()) dispose();
    vi.unstubAllGlobals();
  });

  it('does no DOM write or layout read on an unchanged offscreen frame; refreshes at 4 Hz and resize', () => {
    const f = fixture();
    f.pois[0].position.z = 40;
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000);
    f.draw();
    const writes = [...(f.view.root as unknown as Element).children].flatMap((el) => [
      vi.spyOn(el, 'setAttribute'),
      vi.spyOn(el.classList, 'toggle'),
      vi.spyOn(el.style, 'setProperty'),
      vi.spyOn(el, 'textContent', 'set'),
      vi.spyOn(el, 'hidden', 'set'),
    ]);
    const reads = vi.spyOn(Element.prototype, 'getBoundingClientRect');
    f.draw();
    for (const spy of writes) expect(spy).not.toHaveBeenCalled();
    expect(reads).not.toHaveBeenCalled();
    now.mockReturnValue(1250);
    f.draw();
    expect(reads).toHaveBeenCalledTimes(1);
    reads.mockClear();
    window.innerWidth = 810;
    f.draw();
    expect(reads).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });

  it('arms the candidate and selects a scannable marker by tap', () => {
    const f = fixture();
    f.pois[1].position.set(5, -100, -40);
    f.scanner.setObjective('a');
    f.scanner.update(0, new Vector3(0, -100, 0), new Vector3(0, 0, -1), false);
    f.draw();
    const markers = (f.view.root as unknown as Element).children;
    const first = markers.find((m) => m.dataset.poi === 'a')!;
    const second = markers.find((m) => m.dataset.poi === 'b')!;
    expect(first.classList.contains('is-armed')).toBe(true);
    expect(second.classList.contains('is-scannable')).toBe(true);
    second.dispatchEvent(new Event('click', { cancelable: true }));
    f.scanner.update(0, new Vector3(0, -100, 0), new Vector3(0, 0, -1), false);
    f.draw();
    expect(f.scanner.view.candidateId).toBe('b');
    expect(second.classList.contains('is-armed')).toBe(true);
    expect(second.classList.contains('is-secondary')).toBe(true);
  });

  it('keeps a previously discovered contact visible when it is armed again this dive', () => {
    const f = fixture();
    f.view.setContactState(() => ({ primary: true, found: true }));
    f.scanner.setObjective('a');
    f.scanner.update(0, f.position, new Vector3(0, 0, -1), false);
    f.draw();
    expect(f.marker('a').hidden).toBe(false);
    expect(f.marker('a').classList.contains('is-armed')).toBe(true);
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
    cleanup.push(
      () => mission.dispose(),
      () => view.dispose(),
    );
    const position = new Vector3(0, -100, 0);
    const camera = new PerspectiveCamera(60, 4 / 3, 0.1, 1000);
    camera.position.copy(position);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    const root = view.root as unknown as Element;
    const edge = root.children[0];
    const marker = (id: string) => root.children.find((node) => node.dataset.poi === id)!;
    const currentIds = () =>
      root.children
        .filter((node) => node.classList.contains('is-current'))
        .map((node) => node.dataset.poi);
    const draw = (objective = nextScanObjective(mission.objectives) ?? null) => {
      scanner.setObjective(objective?.poiId ?? null);
      view.update(camera, position, objective);
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
      position,
      edge,
      marker,
      currentIds,
      draw,
      scan,
    };
  }

  it('refreshes fixed-contact lookup when POIs are replaced or removed', () => {
    const f = fixture();
    f.view.setContactState(() => ({ primary: false, found: true }));
    const replacement = { ...f.pois[0]!, name: 'Replacement contact' };
    f.view.setPois([replacement]);
    f.draw();
    expect(f.marker(replacement.id).title).toBe('Replacement contact');
    expect(f.marker(replacement.id).textContent).toBe('✓ Replacement contact');
    f.view.setPois([]);
    f.draw(null);
    expect(f.currentIds()).toEqual([]);
    expect(f.view.root.children.length).toBe(1);
  });

  it('conceals nearby contacts, marks only the current remote one, and restores persistent names', () => {
    const f = fixture();
    let found = false;
    f.view.setContactState(() => ({ primary: false, found }));
    f.draw();
    expect(f.marker('a').textContent).toMatch(/^\? · \d+ m$/);
    expect(f.marker('a').title).toBe('Unknown contact');
    f.pois[0]!.position.z = -800;
    // A remote unknown contact is hidden unless it is the current target.
    f.draw(null);
    expect(f.marker('a').hidden).toBe(true);
    f.draw();
    expect(f.marker('a').hidden).toBe(false);
    found = true;
    f.draw();
    expect(f.marker('a').textContent).toBe('✓ First contact');
    expect(f.marker('a').title).toBe('First contact');
  });

  it('dims other contacts and shows their distance only within 200 m or as the objective', () => {
    const f = fixture();
    f.view.setContactState(() => ({ primary: false, found: false }));
    f.pois[0].position.set(0, -100, -478);
    f.pois[1].position.set(0, -100, -517);
    f.draw();
    expect(f.marker('a').textContent).toBe('? · 478 m');
    expect(f.marker('a').classList.contains('is-secondary')).toBe(false);
    expect(f.marker('b')).toMatchObject({ hidden: true, textContent: '?' });
    expect(f.marker('b').classList.contains('is-secondary')).toBe(true);
    f.pois[1].position.z = -200;
    f.draw();
    expect(f.marker('b').textContent).toBe('? · 200 m');
    f.pois[1].position.z = -201;
    f.draw();
    expect(f.marker('b').textContent).toBe('?');
    f.draw(f.mission.objectives[1]);
    expect(f.marker('b').classList.contains('is-secondary')).toBe(false);
    expect(f.marker('b').textContent).toBe('? · 201 m');
    f.draw(null);
    expect(f.marker('a').classList.contains('is-secondary')).toBe(false);
    expect(f.marker('a').textContent).toBe('? · 478 m');
    f.view.setContactState(() => ({ primary: false, found: true }));
    f.draw();
    expect(f.marker('a').hidden).toBe(true);
    expect(f.marker('b').hidden).toBe(true);
  });

  function touchPortrait() {
    document.documentElement.classList.toggle('is-touch', true);
    window.innerWidth = 390;
    window.innerHeight = 664;
  }

  it('uses bare unknown symbols on touch, retaining objective distances and marker hooks', () => {
    touchPortrait();
    const f = fixture();
    f.view.setContactState(() => ({ primary: false, found: false }));
    f.draw();
    expect(f.marker('a').textContent).toMatch(/^\? · \d+ m$/);
    expect(f.marker('b').textContent).toBe('?');
    expect(f.marker('b').hidden).toBe(false);
    expect(f.marker('b').dataset.poi).toBe('b');
    expect(f.marker('b').classList.contains('is-secondary')).toBe(true);
    expect(f.marker('b').classList.contains('is-unknown')).toBe(true);
    f.draw(null);
    expect(f.marker('a').textContent).toBe('?');
    expect(f.marker('b').textContent).toBe('?');
  });

  it.each([false, true])(
    'keeps the nearer overlapping contact regardless of POI order (touch: %s)',
    (touch) => {
      if (touch) touchPortrait();
      const f = fixture();
      f.view.setContactState(() => ({ primary: false, found: false }));
      f.pois[0].position.set(0, -100, -100);
      f.pois[1].position.set(0, -100, -33);
      f.draw(null);
      expect(f.marker('a').hidden).toBe(true);
      expect(f.marker('b').hidden).toBe(false);
      f.pois[0].position.z = -20;
      f.draw(null);
      expect(f.marker('a').hidden).toBe(false);
      expect(f.marker('b').hidden).toBe(true);
      // Moving apart restores the previously occluded contact.
      f.pois[1].position.y = -90;
      f.draw(null);
      expect(f.marker('b').hidden).toBe(false);
    },
  );

  it('gives the objective priority over closer contacts, including when it is last', () => {
    touchPortrait();
    const f = fixture();
    f.view.setContactState(() => ({ primary: false, found: false }));
    f.pois[0].position.set(0, -100, -33);
    f.pois[1].position.set(0, -100, -100);
    f.draw(f.mission.objectives[1]);
    expect(f.marker('a').hidden).toBe(true);
    expect(f.marker('b').hidden).toBe(false);
    expect(f.marker('b').classList.contains('is-current')).toBe(true);
  });

  it('hides contacts partially intersecting cached touch controls, but preserves the objective', () => {
    touchPortrait();
    const f = fixture();
    f.view.setContactState(() => ({ primary: false, found: false }));
    f.pois[0].position.set(0, -100, -33);
    f.pois[1].position.set(0, -100, -34);
    const control = new Element();
    control.className = 'tc-buttons';
    const reads = vi.spyOn(control, 'getBoundingClientRect').mockReturnValue({
      left: 215,
      right: 300,
      top: 320,
      bottom: 400,
      width: 85,
      height: 80,
    } as DOMRect);
    const markerReads = vi.spyOn(Element.prototype, 'getBoundingClientRect');
    const query = vi
      .spyOn(document, 'querySelectorAll')
      .mockReturnValue([control] as unknown as NodeListOf<HTMLElement>);
    f.draw(null);
    expect(f.marker('a').hidden).toBe(true);
    expect(f.marker('b').hidden).toBe(true);
    f.draw(null);
    expect(reads).toHaveBeenCalledTimes(1);
    expect(markerReads).not.toHaveBeenCalled();
    f.draw();
    expect(f.marker('a').hidden).toBe(false);
    expect(f.marker('b').hidden).toBe(true);
    // Desktop markers keep their distance and ignore touch controls.
    document.documentElement.classList.toggle('is-touch', false);
    f.draw(null);
    expect(f.marker('a').hidden).toBe(false);
    expect(f.marker('a').textContent).toBe('? · 33 m');
    query.mockRestore();
    reads.mockRestore();
    markerReads.mockRestore();
  });

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
    expect(f.edge.hidden).toBe(true);

    f.scan(f.pois[0]);
    expect(f.scanner.isScanned('site', 'a')).toBe(true);
    expect(nextScanObjective(f.mission.objectives)?.poiId).toBe('b');
    // A caller still handing over a scanned objective keeps its edge cue until it advances.
    f.draw(f.mission.objectives[0]);
    expect(f.currentIds()).toEqual([]);
    expect(f.marker('a')).toMatchObject({
      hidden: true,
      textContent: '✓ First contact',
      title: 'First contact',
    });
    expect(f.marker('a').classList.contains('is-scanned')).toBe(true);
    expect(f.edge.hidden).toBe(true);

    f.draw();
    expect(f.currentIds()).toEqual(['b']);
    expect(f.marker('a').classList.contains('is-scanned')).toBe(true);
    expect(f.marker('a').hidden).toBe(true);
    expect(f.marker('b')).toMatchObject({
      hidden: false,
      textContent: '◇',
      title: 'Next contact',
      attributes: { 'aria-label': 'Next contact' },
    });
    expect(f.marker('b').classList.contains('is-scanned')).toBe(false);

    f.position.set(0, -80, -60);
    f.draw();
    f.scan(f.pois[1]);
    expect(nextScanObjective(f.mission.objectives)).toBeUndefined();
    f.draw();
    expect(f.currentIds()).toEqual([]);
    expect(f.edge.hidden).toBe(true);
    for (const poi of f.pois) {
      expect(f.marker(poi.id)).toMatchObject({ hidden: true, textContent: `✓ ${poi.name}` });
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
    expect(f.marker('a')).toMatchObject({ hidden: true, textContent: '✓ First contact' });
    expect(f.marker('a').classList.contains('is-scanned')).toBe(true);

    f.view.setVisualHints(true);
    f.draw();
    expect(f.currentIds()).toEqual(['b']);
    expect(f.marker('b')).toMatchObject({ hidden: false, textContent: '◇' });
    expect(f.marker('a')).toMatchObject({ hidden: true, textContent: '✓ First contact' });
    expect(f.marker('a').classList.contains('is-scanned')).toBe(true);
    expect(f.edge.hidden).toBe(true);
  });

  it('uses an offscreen arrow without adding another target label', () => {
    const f = fixture();
    const camera = new PerspectiveCamera(60, 4 / 3, 0.1, 1000);
    camera.position.copy(f.position);
    camera.lookAt(f.position.clone().add(new Vector3(0, 0, 1)));
    camera.updateMatrixWorld(true);
    f.view.update(camera, f.position, { poiId: 'a' });
    expect(f.edge.hidden).toBe(false);
    expect(f.edge.children).toHaveLength(0);
    expect(f.edge.textContent).toBe('');
    expect(f.marker('a').hidden).toBe(true);
  });

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
    f.draw(null);
    expect(f.currentIds()).toEqual([]);
    expect(f.edge.hidden).toBe(true);
    expect(f.marker('a').hidden).toBe(true);
    expect(f.marker('b').hidden).toBe(true);
  });
});
