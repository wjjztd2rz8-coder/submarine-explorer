/**
 * Controls card (F3-ONBOARD): a reference dialog for the control layout of the
 * device the player is using. The device follows the last input (keyboard,
 * gamepad or touch); the tabs let anyone peek at the others. Reachable from
 * Pause and Settings. Also supplies the compact bottom-of-screen tip text.
 */

import type { ActionId, Input } from '../core/Input.js';
import { FocusTrap } from './FocusTrap.js';

export type InputDevice = 'keyboard' | 'gamepad' | 'touch';
export const INPUT_DEVICES: readonly InputDevice[] = ['keyboard', 'gamepad', 'touch'];
const DEVICE_NAME: Record<InputDevice, string> = {
  keyboard: 'Keyboard and mouse',
  gamepad: 'Gamepad',
  touch: 'Touch',
};

export type ControlRow = readonly [control: string, does: string];
export interface ControlGroup {
  heading: string;
  rows: ControlRow[];
}

type KeyOf = (id: ActionId) => string;

/** The layout for one device. `key` supplies the (rebindable) keyboard labels. */
export function controlGroups(device: InputDevice, key: KeyOf, input?: Input): ControlGroup[] {
  if (device === 'touch') {
    return [
      {
        heading: 'Fly',
        rows: [
          ['Left stick', 'Speed and turning'],
          ['Right slider', 'Rise and sink'],
          ['BOOST (hold)', 'Extra speed'],
        ],
      },
      {
        heading: 'Explore',
        rows: [
          ['SCAN (hold)', 'Scan what you are facing'],
          ['LIGHTS', 'Headlights on and off'],
          ['PHOTO', 'Photo mode'],
          ['SONAR', 'Sonar map'],
        ],
      },
      {
        heading: 'View',
        rows: [
          ['Drag the view', 'Look around'],
          ['Pinch', 'Zoom'],
          ['Double-tap', 'Reset the camera'],
          ['Pause button (top)', 'Pause, Journal and Settings'],
        ],
      },
    ];
  }
  if (device === 'gamepad') {
    const pad = (id: ActionId, fallback: string): string =>
      input?.actions.find((a) => a.id === id)?.pad ?? fallback;
    return [
      {
        heading: 'Fly',
        rows: [
          [pad('thrustForward', 'Left stick'), 'Speed and turning'],
          [pad('pitchUp', 'Right stick'), 'Nose up and down'],
          [pad('ballastBlow', 'A'), 'Blow ballast (rise)'],
          [pad('ballastFlood', 'B'), 'Flood ballast (sink)'],
          [pad('boost', 'Right trigger'), 'Boost'],
        ],
      },
      {
        heading: 'Explore',
        rows: [
          [pad('scan', 'Right bumper'), 'Scan (hold)'],
          [pad('toggleLights', 'X'), 'Headlights'],
          [pad('togglePhotoMode', 'Start'), 'Photo mode'],
          [pad('toggleSonar', 'Back'), 'Sonar map'],
          [pad('toggleCamera', 'Y'), 'Camera view'],
          [pad('cycleSimSpeed', 'D-pad up'), 'Sim speed'],
        ],
      },
    ];
  }
  const pair = (a: ActionId, b: ActionId): string => `${key(a)} / ${key(b)}`;
  return [
    {
      heading: 'Fly',
      rows: [
        [pair('thrustForward', 'thrustReverse'), 'Speed ahead and astern'],
        [pair('yawPort', 'yawStarboard'), 'Turn'],
        [pair('ballastBlow', 'ballastFlood'), 'Rise and sink'],
        [pair('pitchUp', 'pitchDown'), 'Nose up and down'],
        [key('boost'), 'Boost'],
      ],
    },
    {
      heading: 'Explore',
      rows: [
        [`${key('scan')} (hold)`, 'Scan what you are facing'],
        [key('toggleLights'), 'Headlights'],
        [key('togglePhotoMode'), 'Photo mode'],
        [key('toggleJournal'), 'Journal'],
        [key('toggleSonar'), 'Sonar map'],
        [key('toggleRov'), 'Deploy or retrieve the ROV'],
      ],
    },
    {
      heading: 'View',
      rows: [
        ['Drag', 'Look around'],
        ['Wheel', 'Zoom'],
        [key('toggleCamera'), 'Camera view'],
        [key('resetCamera'), 'Reset camera'],
        ['Esc', 'Pause'],
      ],
    },
  ];
}

/** The one-line strip at the bottom of the dive view, for the active device. */
export function compactTips(
  device: InputDevice,
  key: KeyOf,
  rovDeployed: boolean,
  input?: Input,
): string | null {
  if (device === 'touch') return null; // the on-screen buttons are the tips
  if (device === 'gamepad') {
    const pad = (id: ActionId, fallback: string): string =>
      input?.actions.find((a) => a.id === id)?.pad ?? fallback;
    return rovDeployed
      ? 'Left stick fly and turn · A/B rise or sink · Right bumper scan'
      : `Left stick fly and turn · ${pad('ballastBlow', 'A')}/${pad('ballastFlood', 'B')} rise or sink · ${pad('scan', 'Right bumper')} scan · ${pad('toggleLights', 'X')} lights`;
  }
  return rovDeployed
    ? `${key('thrustForward')}/${key('thrustReverse')} fly · ${key('yawPort')}/${key('yawStarboard')} turn · ${key('ballastBlow')}/${key('ballastFlood')} rise/sink · ${key('scan')} scan · ${key('toggleRov')} retrieve ROV`
    : `${key('thrustForward')}/${key('thrustReverse')} speed · ${key('yawPort')}/${key('yawStarboard')} turn · ${key('ballastBlow')}/${key('ballastFlood')} rise/sink · Drag: look · Wheel: zoom · ${key('resetCamera')}: reset camera`;
}

export interface ControlsCardOptions {
  key: KeyOf;
  input?: Input;
  initialDevice: InputDevice;
  /** Opens the key-binding page (keyboard layout only). */
  onRebind?: () => void;
  parent?: HTMLElement;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export class ControlsCard {
  readonly root: HTMLDivElement;
  private readonly body: HTMLElement;
  private readonly heading: HTMLElement;
  private readonly tabs = new Map<InputDevice, HTMLButtonElement>();
  private readonly rebind: HTMLButtonElement;
  private readonly trap: FocusTrap;
  private device_: InputDevice;
  private viewing: InputDevice;
  private open_ = false;

  constructor(private readonly opts: ControlsCardOptions) {
    this.device_ = opts.initialDevice;
    this.viewing = opts.initialDevice;
    this.root = el('div', 'controls-card');
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Controls guide');
    const panel = el('div', 'controls-card-panel');
    this.heading = el('h2', 'controls-card-title', 'Controls');
    const tabs = el('div', 'controls-card-tabs');
    tabs.setAttribute('role', 'group');
    tabs.setAttribute('aria-label', 'Input device');
    for (const device of INPUT_DEVICES) {
      const b = el('button', 'controls-card-tab', DEVICE_NAME[device]);
      b.type = 'button';
      b.addEventListener('click', () => {
        this.viewing = device;
        this.render();
      });
      this.tabs.set(device, b);
      tabs.append(b);
    }
    this.body = el('div', 'controls-card-body');
    const actions = el('div', 'controls-card-actions');
    this.rebind = el('button', 'controls-card-rebind', 'Change keys');
    this.rebind.type = 'button';
    this.rebind.addEventListener('click', () => {
      this.close();
      opts.onRebind?.();
    });
    const done = el('button', 'controls-card-close', 'Close');
    done.type = 'button';
    done.addEventListener('click', () => this.close());
    actions.append(this.rebind, done);
    panel.append(this.heading, tabs, this.body, actions);
    this.root.append(panel);
    (opts.parent ?? document.body).append(this.root);
    this.trap = new FocusTrap(this.root);
    this.render();
  }

  get isOpen(): boolean {
    return this.open_;
  }

  /** The device the player last used. */
  get device(): InputDevice {
    return this.device_;
  }

  setDevice(device: InputDevice): void {
    if (device === this.device_) return;
    this.device_ = device;
    if (!this.open_) this.viewing = device;
    this.render();
  }

  compactTips(rovDeployed: boolean): string | null {
    return compactTips(this.device_, this.opts.key, rovDeployed, this.opts.input);
  }

  open(): void {
    if (this.open_) return;
    this.open_ = true;
    this.viewing = this.device_;
    this.render();
    this.root.hidden = false;
    document.exitPointerLock?.();
    this.trap.activate();
    this.root.querySelector<HTMLButtonElement>('.controls-card-close')?.focus();
  }

  close(): void {
    if (!this.open_) return;
    this.open_ = false;
    this.root.hidden = true;
    this.trap.deactivate();
  }

  dispose(): void {
    this.close();
    this.root.remove();
  }

  private render(): void {
    for (const [device, button] of this.tabs) {
      button.setAttribute('aria-pressed', String(device === this.viewing));
      button.classList.toggle('is-current', device === this.device_);
    }
    this.rebind.hidden = this.viewing !== 'keyboard' || !this.opts.onRebind;
    this.body.replaceChildren();
    const note = el(
      'p',
      'controls-card-note',
      this.viewing === this.device_
        ? `Showing the layout for your ${DEVICE_NAME[this.viewing].toLowerCase()}.`
        : `Showing the ${DEVICE_NAME[this.viewing].toLowerCase()} layout.`,
    );
    this.body.append(note);
    for (const group of controlGroups(this.viewing, this.opts.key, this.opts.input)) {
      const section = el('section', 'controls-card-group');
      section.append(el('h3', 'controls-card-heading', group.heading));
      const list = el('dl', 'controls-card-list');
      for (const [control, does] of group.rows) {
        const row = el('div', 'controls-card-row');
        row.append(
          el('dt', 'controls-card-control', control),
          el('dd', 'controls-card-does', does),
        );
        list.append(row);
      }
      section.append(list);
      this.body.append(section);
    }
  }
}
