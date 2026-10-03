/**
 * The Journal's photo gallery (D-PHOTO): a grid of thumbnails, a larger viewer
 * with the caption, date and depth, and a delete button. Plain DOM, rendered
 * into whatever container the Journal hands it.
 */

import type { Photo, PhotoStore } from '../game/PhotoStore.js';
import { writeZip } from '../util/zip.js';

export function photoFilename(photo: Pick<Photo, 'siteName' | 'poiName' | 'at'>): string {
  const slug = (value: string): string =>
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'photo';
  const date = Number.isNaN(Date.parse(photo.at)) ? 'undated' : photo.at.slice(0, 10);
  return `${slug(photo.siteName)}-${slug(photo.poiName ?? 'photo')}-${date}.jpg`;
}

function download(url: string, name: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
}

function imageBytes(image: string): Uint8Array {
  const binary = atob(image.slice(image.indexOf(',') + 1));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  label?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (label) node.textContent = label;
  return node;
}

/** "Titanic · Bow section", or just the site when no POI was in frame. */
export function photoCaption(photo: Pick<Photo, 'siteName' | 'poiName'>): string {
  return [photo.siteName, photo.poiName].filter(Boolean).join(' · ');
}

/** "24 Sep 2026, 14:05 · 3,790 m deep" */
export function photoDetail(photo: Pick<Photo, 'at' | 'depthM'>): string {
  const when = new Date(photo.at).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return `${when} · ${Math.round(photo.depthM).toLocaleString('en-US')} m deep`;
}

export class PhotoGallery {
  constructor(
    private readonly store: PhotoStore,
    /** Called after a delete so the owner can re-render (counts, lists). */
    private readonly onChange: () => void = () => {},
  ) {}

  /** A titled grid of `photos` (newest first); a thumbnail click opens the viewer. */
  render(container: HTMLElement, photos: readonly Photo[], title = 'Photos'): void {
    container.replaceChildren();
    const heading = el('div', 'd2-photo-heading');
    heading.append(el('h2', 'jr-photo-title', title));
    if (photos.length) {
      const all = el('button', 'd2-photo-download-all', 'Download all');
      all.type = 'button';
      all.addEventListener('click', () => {
        const names = new Map<string, number>();
        const entries = photos.map((photo) => {
          const base = photoFilename(photo);
          const count = names.get(base) ?? 0;
          names.set(base, count + 1);
          return {
            name: count ? base.replace(/\.jpg$/, `-${count + 1}.jpg`) : base,
            data: imageBytes(photo.image),
          };
        });
        const bytes = writeZip(entries);
        const url = URL.createObjectURL(
          new Blob([bytes.buffer as ArrayBuffer], { type: 'application/zip' }),
        );
        download(url, 'journal-photos.zip');
        window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      });
      heading.append(all);
    }
    container.append(heading);
    if (!photos.length) {
      container.append(
        el(
          'p',
          'jr-empty',
          'No photos yet. During a dive press P for photo mode, frame a wreck or feature, ' +
            'then press Enter to save it here.',
        ),
      );
      return;
    }
    const grid = el('div', 'jr-photo-grid');
    for (const photo of photos) {
      const card = el('button', 'jr-photo-card');
      card.type = 'button';
      card.dataset.photoId = photo.id;
      const image = el('img');
      image.src = photo.image;
      image.alt = photoCaption(photo);
      card.append(image, el('span', 'jr-photo-card-caption', photoCaption(photo)));
      card.addEventListener('click', () => this.renderViewer(container, photos, photo, title));
      const item = el('div', 'd2-photo-item');
      const single = el('button', 'd2-photo-download', 'Download');
      single.type = 'button';
      single.setAttribute('aria-label', `Download ${photoCaption(photo)}`);
      single.addEventListener('click', () => download(photo.image, photoFilename(photo)));
      item.append(card, single);
      grid.append(item);
    }
    container.append(grid);
  }

  private renderViewer(
    container: HTMLElement,
    photos: readonly Photo[],
    photo: Photo,
    title: string,
  ): void {
    container.replaceChildren();
    const back = el('button', 'jr-photo-back', '← All photos');
    back.type = 'button';
    back.addEventListener('click', () => {
      this.render(container, photos, title);
      [...container.querySelectorAll<HTMLButtonElement>('[data-photo-id]')]
        .find((button) => button.dataset.photoId === photo.id)
        ?.focus();
    });
    const figure = el('figure', 'jr-photo-viewer');
    const image = el('img');
    image.src = photo.image;
    image.alt = photoCaption(photo);
    figure.append(image, el('figcaption', 'jr-photo-caption', photoCaption(photo)));
    const detail = el('p', 'jr-photo-detail', photoDetail(photo));
    const remove = el('button', 'jr-photo-delete', 'Delete photo');
    remove.type = 'button';
    remove.addEventListener('click', () => {
      if (this.store.delete(photo.id)) this.onChange();
      else remove.after(el('p', 'jr-photo-error', 'Could not delete this photo.'));
    });
    const actions = el('div', 'jr-photo-actions');
    const single = el('button', 'd2-photo-download', 'Download');
    single.type = 'button';
    single.addEventListener('click', () => download(photo.image, photoFilename(photo)));
    actions.append(back, single, remove);
    container.append(figure, detail, actions);
    back.focus();
  }
}
