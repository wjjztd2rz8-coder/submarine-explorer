import { afterEach, expect, it, vi } from 'vitest';
import { TUTORIAL_STEPS } from '../../src/game/Tutorial.js';
import { TutorialCard, tutorialText } from '../../src/ui/TutorialCard.js';

// Exercise the rendered copy; viewport visibility is checked in Playwright.
class Element extends EventTarget {
  children: Element[] = [];
  className = '';
  textContent = '';
  hidden = false;
  dataset: Record<string, string> = {};
  setAttribute() {}
  append(...children: Element[]) {
    this.children.push(...children);
  }
  querySelectorAll() {
    return [];
  }
  remove() {}
}

afterEach(() => vi.unstubAllGlobals());

it('phone tutorial follows touch, remapped keyboard and gamepad on every step', () => {
  const body = new Element();
  vi.stubGlobal('document', { body, createElement: () => new Element() });
  const card = new TutorialCard({ skipStep() {}, skipAll() {} });
  const phone = (card.root as unknown as Element).children.find(
    (child) => child.className === 'onboard-card-phone-text',
  )!;
  const keys = {
    move: 'I',
    turn: 'K or O',
    rise: 'U',
    sink: 'N',
    lights: 'H',
    scan: 'B',
    photo: 'V',
    journal: 'Z',
  };
  for (const [index, step] of TUTORIAL_STEPS.entries()) {
    card.show(index, tutorialText(step.id, 'touch', keys), 'touch');
    const touch = phone.textContent;
    expect(touch).toMatch(/stick|slider|LIGHTS|SCAN|PHOTO/);
    for (const device of ['keyboard', 'gamepad'] as const) {
      const text = tutorialText(step.id, device, keys);
      card.show(index, text, device);
      expect(phone.textContent).toBe(text);
    }
    card.show(index, tutorialText(step.id, 'touch', keys), 'touch');
    expect(phone.textContent).toBe(touch);
  }
  card.dispose();
});

it('changing devices repaints phone copy even when the full text is identical', () => {
  const body = new Element();
  vi.stubGlobal('document', { body, createElement: () => new Element() });
  const card = new TutorialCard({ skipStep() {}, skipAll() {} });
  const phone = (card.root as unknown as Element).children[3];
  const text = 'Shared instruction';
  card.show(0, text, 'touch');
  expect(phone.textContent).toBe('Push left stick forward; sideways to turn.');
  card.show(0, text, 'keyboard');
  expect(phone.textContent).toBe(text);
  card.dispose();
});

it('phone scan progress and navigation copy survive the compact presentation', () => {
  const body = new Element();
  vi.stubGlobal('document', { body, createElement: () => new Element() });
  const card = new TutorialCard({ skipStep() {}, skipAll() {} });
  const phone = (card.root as unknown as Element).children[3];
  const keys = {
    move: 'W',
    turn: 'A or D',
    rise: 'Space',
    sink: 'Shift',
    lights: 'L',
    scan: 'G',
    photo: 'P',
    journal: 'J',
  };
  card.show(0, tutorialText('move', 'touch', keys, null, 'the bow'), 'touch');
  expect(phone.textContent).toContain('Follow the marker toward the bow');
  card.show(3, tutorialText('scan', 'touch', keys, 0.42), 'touch');
  expect(phone.textContent).toBe('Scanning… 42% · keep holding SCAN.');
  card.show(3, tutorialText('scan', 'touch', keys), 'touch');
  expect(phone.textContent).not.toContain('Scanning…');
});
