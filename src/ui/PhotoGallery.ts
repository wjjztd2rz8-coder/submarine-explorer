/**
 * The Journal's photo gallery (D-PHOTO): a grid of thumbnails, a larger viewer
 * with the caption, date and depth, and a delete button. Plain DOM, rendered
 * into whatever container the Journal hands it.
 */

import type { Photo, PhotoStore } from '../game/PhotoStore.js';

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
    container.append(el('h2', 'jr-photo-title', title));
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
      grid.append(card);
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
    back.addEventListener('click', () => this.render(container, photos, title));
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
    actions.append(back, remove);
    container.append(figure, detail, actions);
    back.focus();
  }
}
