/**
 * Photo mode (D-PHOTO). Photos live in their own store (subexplorer.photos.v1)
 * and show in the Journal's Photos page and on each POI entry; the viewfinder
 * is PhotoMode. Photo mode freezes the sim like pause; the camera orbits
 * whatever is being piloted (the ROV when deployed) and leaving restores the
 * previous view. The capture reads the canvas right after the draw.
 */

import type * as THREE from 'three';
import { PHOTO_LIMIT, PhotoStore, poiInPhoto } from '../../game/PhotoStore.js';
import type { PlacedPoi } from '../../game/Pois.js';
import { PhotoGallery } from '../../ui/PhotoGallery.js';
import { PhotoMode, canvasThumbnail } from '../../ui/PhotoMode.js';
import { LIFE_ID_PREFIX } from '../../world/life/Life.js';
import type { GameContext } from '../context.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';

const cleanup = new Disposables();

export function createPhotoSystem(): GameSystem {
  let photoCaptureRequested = false;
  let photoPoi: PlacedPoi | null = null;
  /** F2-LIFE: the animal in frame when no POI is (an `id` of the form `life:<species>`). */
  let photoAnimal: { id: string; name: string } | null = null;
  let lastCaptureMs = -Infinity;

  const enterPhotoMode = (ctx: GameContext): void => {
    const { journal, rig, rov, sub, photoMode, input } = ctx;
    document.exitPointerLock?.();
    void journal.load(); // site names for the caption
    rig.enterPhotoMode(rov.deployed ? rov.position : sub.position);
    photoMode.setActive(true, input.primaryKeyLabel('capturePhoto'));
    photoCaptureRequested = false;
  };

  const capturePhoto = (ctx: GameContext, target: THREE.Vector3): void => {
    const { renderer, photoMode, photos, journal, contentLandmark } = ctx;
    const now = performance.now();
    if (now - lastCaptureMs < 400) return; // Enter on the focused button fires twice
    lastCaptureMs = now;
    const image = canvasThumbnail(renderer.domElement);
    if (!image) {
      photoMode.toast('This browser could not create the photo.', true);
      return;
    }
    const result = photos.save({
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      image,
      siteId: contentLandmark,
      siteName: journal.siteName(contentLandmark),
      poiId: photoPoi?.id ?? photoAnimal?.id ?? null,
      poiName: photoPoi?.name ?? photoAnimal?.name ?? null,
      at: new Date().toISOString(),
      depthM: Math.round(Math.max(0, -target.y) * 10) / 10,
    });
    if (!result.saved) photoMode.toast(result.error, true);
    else if (result.dropped) {
      photoMode.shutter();
      ctx.audio.playShutter();
      photoMode.toast(
        `Saved to Journal · oldest ${result.dropped === 1 ? 'photo' : `${result.dropped} photos`} removed (keeps ${PHOTO_LIMIT})`,
      );
    } else {
      photoMode.shutter();
      ctx.audio.playShutter();
      photoMode.toast('Saved to Journal');
    }
    journal.refresh();
  };

  return {
    name: 'photo',
    dispose: () => cleanup.dispose(),
    init(ctx) {
      const { journal } = ctx;
      const photos = new PhotoStore();
      ctx.photos = photos;
      journal.setPhotoGallery(photos, new PhotoGallery(photos, () => journal.refresh()));
      const photoMode = new PhotoMode(() => {
        photoCaptureRequested = true;
      });
      ctx.photoMode = photoMode;
      ctx.exitPhotoMode = (): void => {
        if (!photoMode.active) return;
        photoMode.setActive(false);
        ctx.rig.exitPhotoMode();
        photoCaptureRequested = false;
        // Orbit drag/wheel still queued for this frame must not move the old view.
        ctx.input.state.lookDx = 0;
        ctx.input.state.lookDy = 0;
        ctx.input.wheelDelta = 0;
      };
      ctx.expose({ photos, photoMode });
    },
    // After the ROV's listeners, as before F0 (it was the last app:state listener).
    start(ctx) {
      cleanup.add(
        ctx.bus.on('app:state', ({ state }) => {
          if (state !== 'dive') ctx.exitPhotoMode();
        }),
      );
    },
    frame: {
      'gate.photo': (f, ctx) => {
        const { photoMode } = ctx;
        if (photoMode.active && f.blocked) ctx.exitPhotoMode();
        else if (f.sampled.togglePhotoMode) {
          if (photoMode.active) ctx.exitPhotoMode();
          else if (!f.blocked) enterPhotoMode(ctx);
        }
        f.frozen = f.frozen || photoMode.active;
      },
      'camera.photo': (f, ctx) => {
        if (!ctx.photoMode.active) return;
        photoPoi = poiInPhoto(ctx.rig.camera, ctx.discovery.pois, f.pilotPosition);
        const animal = photoPoi ? null : (ctx.life?.animalInView(ctx.rig.camera) ?? null);
        photoAnimal = animal ? { id: `${LIFE_ID_PREFIX}${animal.id}`, name: animal.common } : null;
        ctx.photoMode.setCaption(
          ctx.journal.siteName(ctx.contentLandmark),
          photoPoi?.name ?? photoAnimal?.name ?? null,
        );
        if (f.sampled.capturePhoto) photoCaptureRequested = true;
      },
      // Read the canvas in the same task as the render, before it is composited.
      'render.capture': (f, ctx) => {
        if (!photoCaptureRequested) return;
        photoCaptureRequested = false;
        if (ctx.photoMode.active) capturePhoto(ctx, f.pilotPosition);
      },
    },
  };
}
