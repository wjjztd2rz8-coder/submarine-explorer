/**
 * The tutorial coach card and hint chip (F3-ONBOARD). Placement lives in the
 * HUD layout; hints share the scan-target column. Neither takes focus, and
 * only their own buttons catch pointer events.
 */

import type { TutorialStepId } from '../game/Tutorial.js';
import { TUTORIAL_STEPS } from '../game/Tutorial.js';
import type { InputDevice } from './ControlsCard.js';
import { FIRST_MINUTE_GUIDANCE } from '../core/Config.js';

export interface TutorialKeys {
  move: string;
  turn: string;
  rise: string;
  sink: string;
  lights: string;
  scan: string;
  photo: string;
  journal: string;
}

/** Instruction text for a step on the given device. */
export function tutorialText(id: TutorialStepId, device: InputDevice, k: TutorialKeys): string {
  switch (id) {
    case 'move':
      return device === 'touch'
        ? 'Push the left stick forward to move, then sideways to turn.'
        : device === 'gamepad'
          ? 'Use the left stick: up to move, sideways to turn.'
          : `Hold ${k.move} to move, then ${k.turn} to turn.`;
    case 'depth':
      return device === 'touch'
        ? 'Slide the right slider up to rise or down to sink.'
        : device === 'gamepad'
          ? `Press ${k.rise} to rise or ${k.sink} to sink.`
          : `Hold ${k.rise} to rise or ${k.sink} to sink.`;
    case 'lights':
      return device === 'touch'
        ? 'Tap LIGHTS to switch the headlights.'
        : `Press ${k.lights} to switch the headlights.`;
    case 'scan':
      return device === 'touch'
        ? 'Face a glowing target and hold SCAN until it finishes.'
        : `Face a glowing target and hold ${k.scan} until it finishes.`;
    case 'journal':
      return device === 'touch'
        ? 'Tap PHOTO to frame a shot, or Pause then Journal to read your finds.'
        : `Press ${k.photo} for photo mode, or ${k.journal} to open the Journal.`;
  }
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

/** A button that gives focus back so Space (ballast) never re-presses it. */
function plainButton(label: string, className: string, act: () => void): HTMLButtonElement {
  const b = el('button', className, label);
  b.type = 'button';
  b.addEventListener('click', () => {
    act();
    b.blur();
  });
  return b;
}

export interface TutorialCardActions {
  skipStep(): void;
  skipAll(): void;
}

export class TutorialCard {
  readonly root: HTMLDivElement;
  private readonly count: HTMLElement;
  private readonly title: HTMLElement;
  private readonly text: HTMLElement;
  private readonly phoneText: HTMLElement;
  private readonly dots: HTMLElement;
  private shownKey = '';

  constructor(actions: TutorialCardActions, parent: HTMLElement = document.body) {
    this.root = el('div', 'onboard-card');
    this.root.hidden = true;
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-label', 'Tutorial');
    this.count = el('p', 'onboard-card-count');
    this.title = el('h2', 'onboard-card-title');
    this.text = el('p', 'onboard-card-text');
    this.text.setAttribute('aria-live', 'polite');
    this.phoneText = el('p', 'onboard-card-phone-text');
    this.phoneText.setAttribute('aria-live', 'polite');
    this.dots = el('div', 'onboard-card-dots');
    this.dots.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < TUTORIAL_STEPS.length; i += 1) this.dots.append(el('span', 'onboard-dot'));
    const buttons = el('div', 'onboard-card-buttons');
    const skipStep = plainButton('', 'onboard-skip-step', actions.skipStep);
    skipStep.append(
      el('span', 'onboard-skip-desktop', 'Skip step'),
      el('span', 'onboard-skip-phone', 'Skip'),
    );
    buttons.append(skipStep, plainButton('Skip tutorial', 'onboard-skip-all', actions.skipAll));
    const head = el('div', 'onboard-card-head');
    head.append(this.count, this.dots);
    this.root.append(head, this.title, this.text, this.phoneText, buttons);
    parent.append(this.root);
  }

  get visible(): boolean {
    return !this.root.hidden;
  }

  /** Show step `index` with `text`, or hide when `index` is null. */
  show(index: number | null, text = '', device: InputDevice = 'keyboard'): void {
    if (index === null) {
      this.root.hidden = true;
      this.shownKey = '';
      return;
    }
    const key = `${index}|${text}|${device}`;
    this.root.hidden = false;
    if (key === this.shownKey) return;
    this.shownKey = key;
    this.root.dataset.step = TUTORIAL_STEPS[index]?.id ?? '';
    this.count.textContent = `Step ${index + 1} of ${TUTORIAL_STEPS.length}`;
    this.title.textContent = TUTORIAL_STEPS[index]?.title ?? '';
    this.text.textContent = text;
    // Presentation only: the same five steps and skipStep action still run.
    const phoneInstructions: Record<TutorialStepId, string> = {
      move: 'Push left stick forward; sideways to turn.',
      depth: 'Right slider: up to rise, down to sink.',
      lights: 'Tap LIGHTS to switch the headlights.',
      scan: 'Face a glowing target; hold SCAN to finish.',
      journal: 'Tap PHOTO, or Pause → Journal for your finds.',
    };
    const step = TUTORIAL_STEPS[index];
    this.phoneText.textContent = step && device === 'touch' ? phoneInstructions[step.id] : text;
    this.dots.querySelectorAll('.onboard-dot').forEach((dot, i) => {
      dot.classList.toggle('is-done', i < index);
      dot.classList.toggle('is-current', i === index);
    });
  }

  dispose(): void {
    this.root.remove();
  }
}

/** One dismissable line, shown for a few seconds. */
export class HintChip {
  readonly root: HTMLDivElement;
  private readonly text: HTMLElement;
  private timer = 0;
  private fadeTimer = 0;

  constructor(parent: HTMLElement = document.body) {
    this.root = el('div', 'onboard-hint');
    this.root.hidden = true;
    this.root.setAttribute('role', 'status');
    this.root.style.setProperty('--guidance-fade-ms', `${FIRST_MINUTE_GUIDANCE.fadeMs}ms`);
    this.text = el('span', 'onboard-hint-text');
    const close = plainButton('Dismiss', 'onboard-hint-close', () => this.hide());
    close.setAttribute('aria-label', 'Dismiss hint');
    close.textContent = '×';
    this.root.append(this.text, close);
    parent.append(this.root);
  }

  get visible(): boolean {
    return !this.root.hidden;
  }

  show(message: string, seconds = 9): void {
    this.text.textContent = message;
    this.root.classList.remove('is-guidance-fading');
    this.root.hidden = false;
    window.clearTimeout(this.timer);
    window.clearTimeout(this.fadeTimer);
    // Keep expiry independent of the fade callback: delayed/coalesced timers
    // must not start another quarter second of lifetime after the deadline.
    this.fadeTimer = window.setTimeout(
      () => this.root.classList.add('is-guidance-fading'),
      Math.max(0, seconds * 1000 - FIRST_MINUTE_GUIDANCE.fadeMs),
    );
    this.timer = window.setTimeout(() => this.hide(), Math.max(0, seconds * 1000));
  }

  /** Keep the shared scan column in flow until the fade has finished. */
  fade(): void {
    if (!this.visible || this.root.classList.contains('is-guidance-fading')) return;
    window.clearTimeout(this.timer);
    window.clearTimeout(this.fadeTimer);
    this.root.classList.add('is-guidance-fading');
    this.timer = window.setTimeout(() => this.hide(), FIRST_MINUTE_GUIDANCE.fadeMs);
  }

  hide(): void {
    window.clearTimeout(this.timer);
    window.clearTimeout(this.fadeTimer);
    this.root.hidden = true;
  }

  dispose(): void {
    this.hide();
    this.root.remove();
  }
}
