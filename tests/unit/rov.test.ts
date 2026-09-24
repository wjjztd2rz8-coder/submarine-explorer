import { PointLight, SpotLight, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import {
  BINDINGS_STORAGE_KEY,
  PREVIOUS_BINDINGS_STORAGE_KEY,
  Input,
} from '../../src/core/Input.js';
import { DiscoveryStore } from '../../src/game/DiscoveryStore.js';
import { Scanner } from '../../src/game/Scanner.js';
import { Rov } from '../../src/rov/Rov.js';
import { RovVisual } from '../../src/rov/RovVisual.js';
import { Headlights } from '../../src/render/Headlights.js';
import { atmosphereTier } from '../../src/render/Atmosphere.js';

const floor = { widthM: 1000, depthM: 1000, sampleHeight: () => -200 };
const anchor = new Vector3(0, -100, 0);
const input = { throttle: 1, yaw: 0, ballast: 0, pitch: 0, boost: false };

describe('tethered ROV', () => {
  it('lights the frame and working area while keeping the sub spotlights on', () => {
    const visual = new RovVisual(DEFAULT_CONFIG.rov);
    const spots: SpotLight[] = [];
    const fills: PointLight[] = [];
    visual.group.traverse((object) => {
      if (object instanceof SpotLight) spots.push(object);
      if (object instanceof PointLight) fills.push(object);
    });
    expect(spots).toHaveLength(2);
    expect(fills).toHaveLength(1);
    visual.setLightPreset(DEFAULT_CONFIG.lightPresets.realistic);
    const realistic = spots[0]!.intensity;
    expect(realistic).toBeGreaterThan(0);
    expect(fills[0]!.intensity).toBeGreaterThan(0);
    visual.setLightPreset(DEFAULT_CONFIG.lightPresets.enhanced);
    expect(spots[0]!.intensity).toBeGreaterThan(realistic);
    expect(spots[0]!.distance).toBeGreaterThanOrEqual(40);

    const subLights = new Headlights(
      DEFAULT_CONFIG.water,
      atmosphereTier(DEFAULT_CONFIG.water, 'medium'),
    );
    subLights.setPreset(DEFAULT_CONFIG.lightPresets.enhanced);
    subLights.setConesSuppressed(true);
    expect(subLights.lights.every((light) => light.visible && light.intensity > 0)).toBe(true);
    expect(subLights.fill.visible).toBe(true);
  });

  it('exposes E as an edge action and adds it to earlier v2 bindings', () => {
    const values = new Map([
      [PREVIOUS_BINDINGS_STORAGE_KEY, JSON.stringify({ version: 2, keys: { scan: ['KeyF'] } })],
    ]);
    const input = new Input({
      storage: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => {
          values.set(key, value);
        },
        removeItem: (key) => {
          values.delete(key);
        },
      },
    });
    expect(input.primaryKeyLabel('toggleRov')).toBe('E');
    expect(input.primaryKeyLabel('scan')).toBe('G');
    expect(JSON.parse(values.get(BINDINGS_STORAGE_KEY)!).version).toBe(3);
    expect(JSON.parse(values.get(BINDINGS_STORAGE_KEY)!).keys.toggleRov).toEqual(['KeyE']);
    input.injectKey('KeyE', true);
    expect(input.sample().toggleRov).toBe(true);
    input.endFrame();
    expect(input.sample().toggleRov).toBe(false);
  });

  it('deploys below and ahead, stays inside its tether, then returns to the sub', () => {
    const rov = new Rov(DEFAULT_CONFIG.rov, floor);
    expect(rov.deploy(anchor, 0)).toBe(true);
    expect(rov.position.z).toBeLessThan(anchor.z);
    expect(rov.position.y).toBeLessThan(anchor.y);
    for (let i = 0; i < 7000; i++) rov.step(1 / 60, input, anchor);
    expect(rov.tetherUsedM).toBeLessThanOrEqual(DEFAULT_CONFIG.rov.tetherLengthM + 1e-6);
    expect(rov.tetherLimit).toBe(true);
    rov.retrieve();
    for (let i = 0; i < 600 && rov.deployed; i++) rov.step(1 / 60, input, anchor);
    expect(rov.deployed).toBe(false);
    expect(rov.tetherUsedM).toBe(0);
  });

  it('holds its own seabed clearance and aborts immediately', () => {
    const rov = new Rov(DEFAULT_CONFIG.rov, floor);
    rov.deploy(anchor, 0);
    const dive = { ...input, throttle: 0, ballast: -1 };
    for (let i = 0; i < 10000; i++) rov.step(1 / 60, dive, anchor);
    expect(rov.position.y).toBeGreaterThanOrEqual(
      -200 + DEFAULT_CONFIG.rov.radiusM + DEFAULT_CONFIG.rov.clearanceM,
    );
    rov.abort();
    expect(rov.mode).toBe('stowed');
  });

  it('uses the shared scanner and completes a target only once per dive', () => {
    const bus = new EventBus();
    const store = new DiscoveryStore(null);
    const scanner = new Scanner(DEFAULT_CONFIG.scan, bus, store);
    const rov = new Rov(DEFAULT_CONFIG.rov, floor);
    rov.deploy(anchor, 0);
    const target = {
      id: 'tight-poi',
      name: 'Tight POI',
      landmarkId: 'test',
      position: rov.position.clone().add(new Vector3(0, 0, -20)),
      radius: 30,
      scanSeconds: 0.2,
    };
    scanner.setTargets([target]);
    let completed = 0;
    bus.on('scan:complete', () => completed++);
    for (let i = 0; i < 120; i++) scanner.update(1 / 60, rov.position, rov.forward, true);
    expect(completed).toBe(1);
    expect(scanner.view.completed).toBe(1);
    expect(store.isDiscovered('test', 'tight-poi')).toBe(true);
  });
});
