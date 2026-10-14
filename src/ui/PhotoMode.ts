/**
 * Photo mode's viewfinder overlay (D-PHOTO). While it is up the HUD is hidden
 * (`body.photo-active`, styles.css) and the game loop freezes the sim; this
 * class only owns the DOM: the caption naming what is in frame, the one-line
 * control tips, a capture button and a short-lived status toast.
 */

import { PHOTO_FRAMES, type CosmeticSelection } from '../game/Cosmetics.js';
import { FocusTrap } from './FocusTrap.js';

const PHOTO_WIDTH_PX = 640;
const PHOTO_JPEG_QUALITY = 0.76;

/**
 * A JPEG data URL of `source` scaled to at most `width` pixels wide. Call it
 * in the same task as the render that drew `source` (the WebGL drawing buffer
 * is only guaranteed until the frame is composited). Null if the browser
 * cannot encode.
 */
export function canvasThumbnail(
  source: HTMLCanvasElement,
  width = PHOTO_WIDTH_PX,
  quality = PHOTO_JPEG_QUALITY,
  frame: CosmeticSelection['frame'] = 'stock',
): string | null {
  const w = Math.min(width, source.width);
  const h = Math.max(1, Math.round((source.height * w) / Math.max(1, source.width)));
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  if (!ctx || w < 1) return null;
  ctx.drawImage(source, 0, 0, w, h);
  const color = PHOTO_FRAMES.find((def) => def.id === frame)?.color;
  if (color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, Math.round(w / 80));
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  }
  const url = out.toDataURL('image/jpeg', quality);
  return url.startsWith('data:image/jpeg;base64,') ? url : null;
}

export class PhotoMode {
  readonly root: HTMLDivElement;
  private readonly caption: HTMLParagraphElement;
  private readonly tips: HTMLParagraphElement;
  private readonly toastEl: HTMLParagraphElement;
  private readonly captureButton: HTMLButtonElement;
  private readonly flash: HTMLDivElement;
  private toastTimer = 0;
  private flashTimer = 0;
  private readonly trap: FocusTrap;

  constructor(
    onCapture: () => void,
    onExit: () => void,
    onPause: () => void,
    parent: HTMLElement = document.body,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'photo-mode';
    this.root.hidden = true;
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-label', 'Photo mode');

    const top = document.createElement('div');
    top.className = 'photo-mode-top';
    const kicker = document.createElement('span');
    kicker.className = 'photo-mode-kicker';
    kicker.textContent = 'PHOTO MODE';
    this.caption = document.createElement('p');
    this.caption.className = 'photo-mode-caption';
    this.caption.setAttribute('aria-live', 'polite');
    top.append(kicker, this.caption);

    this.toastEl = document.createElement('p');
    this.toastEl.className = 'photo-mode-toast';
    this.toastEl.setAttribute('role', 'status');
    this.toastEl.hidden = true;
    this.flash = document.createElement('div');
    this.flash.className = 'd2-photo-flash';
    this.flash.setAttribute('aria-hidden', 'true');

    const bottom = document.createElement('div');
    bottom.className = 'photo-mode-bottom';
    this.tips = document.createElement('p');
    this.tips.className = 'photo-mode-tips';
    const capture = document.createElement('button');
    capture.type = 'button';
    capture.className = 'photo-mode-capture';
    this.captureButton = capture;
    capture.addEventListener('click', onCapture);
    const actions = document.createElement('div');
    actions.className = 'photo-mode-actions';
    const exit = document.createElement('button');
    exit.type = 'button';
    exit.className = 'photo-mode-exit';
    exit.textContent = 'Done';
    exit.addEventListener('click', onExit);
    const pause = document.createElement('button');
    pause.type = 'button';
    pause.className = 'photo-mode-pause';
    pause.textContent = 'Pause';
    pause.addEventListener('click', onPause);
    actions.append(capture, exit, pause);
    bottom.append(this.tips, actions);

    top.append(this.toastEl);
    this.root.append(this.flash, top, bottom);
    parent.append(this.root);
    this.trap = new FocusTrap(this.root, { onEscape: onExit });
  }

  get active(): boolean {
    return this.trap.active;
  }

  /** Show or hide the viewfinder; the HUD hides while it is up. */
  setActive(on: boolean, captureKey = 'Enter'): void {
    if (on) this.trap.show();
    document.body.classList.toggle('photo-active', on);
    // Hidden dive controls retain layout boxes but cannot receive restored focus.
    if (!on) this.trap.hide();
    // No keys on a touch screen: the button says what it does, the tip is gestures.
    if (document.documentElement.classList.contains('is-touch')) {
      this.captureButton.textContent = 'Capture';
      this.tips.textContent = 'Drag to orbit · pinch to zoom';
    } else {
      const keys = captureKey === 'Space' ? 'Space' : `${captureKey} / Space`;
      this.captureButton.textContent = `Capture (${keys})`;
      this.tips.textContent = 'Esc: exit · drag: orbit · wheel: zoom';
    }
    if (!on) this.hideToast();
  }

  dispose(): void {
    this.setActive(false);
    window.clearTimeout(this.flashTimer);
    this.trap.dispose();
    this.root.remove();
  }

  shutter(): void {
    if (
      document.documentElement.dataset.reduceMotion === 'true' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    this.flash.classList.remove('is-active');
    void this.flash.offsetWidth;
    this.flash.classList.add('is-active');
    window.clearTimeout(this.flashTimer);
    this.flashTimer = window.setTimeout(() => this.flash.classList.remove('is-active'), 350);
  }

  /** "Titanic · Bow section"; the site alone when nothing is in frame. */
  setCaption(siteName: string, poiName: string | null): void {
    const text = poiName
      ? `${siteName} · ${poiName}`
      : `${siteName} · no point of interest in frame`;
    if (this.caption.textContent !== text) this.caption.textContent = text;
    this.caption.classList.toggle('is-empty', !poiName);
  }

  /** A brief status line; errors stay up longer. */
  toast(message: string, error = false): void {
    this.toastEl.textContent = message;
    this.toastEl.classList.toggle('is-error', error);
    this.toastEl.hidden = false;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.hideToast(), error ? 6000 : 2500);
  }

  private hideToast(): void {
    window.clearTimeout(this.toastTimer);
    this.toastEl.hidden = true;
  }
}
