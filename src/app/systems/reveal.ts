import {
  REVEAL_AUTO_DISMISS_S,
  REVEAL_MIN_CONTINUE_S,
  REVEAL_STILL_CAPTURE_S,
  RevealQueue,
  revealExcerpt,
  revealFrame,
  revealVisibleRect,
  revealStillSubjectY,
} from '../../game/Reveal.js';
import type { RevealViewRect } from '../../game/Reveal.js';
import { entryIdForPoi } from '../../game/Guide.js';
import { DiscoveryCard } from '../../ui/DiscoveryCard.js';
import { canvasThumbnail } from '../../ui/PhotoMode.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';
import { Box3, Vector3 } from 'three';
import type { Object3D } from 'three';
import { REVEAL_DRAG_GRACE_S, RevealGestures } from './revealGestures.js';

/** The look-around hint shows on the first reveal of a page session only. */
let lookHintShown = false;

export function createRevealSystem(): GameSystem {
  const cleanup = new Disposables();
  const queue = new RevealQueue();
  let elapsed = 0;
  /** Auto-close clock: stands still while the player is looking around. */
  let autoElapsed = 0;
  /** Take the journal still this frame (the player is about to move the camera). */
  let captureNow = false;
  let gestures: RevealGestures | null = null;
  let subject: Object3D | null = null;
  let clearRect: RevealViewRect | null = null;
  let frameScale = 1;
  let frameWidth = 0;
  let frameHeight = 0;
  let refit: ((opening?: boolean) => void) | null = null;
  let captured = false;
  let finishing = false;
  let returning = false;
  let readMore = false;
  let ready = false;
  let probeConsumed = false;
  let card: DiscoveryCard;
  const stillTarget = new Vector3();
  let interrupted = false;
  return {
    name: 'reveal',
    dispose: () => cleanup.dispose(),
    init(ctx) {
      const canInteract = (): boolean =>
        ctx.app.state === 'dive' && !document.hidden && !interrupted;
      const skip = (): void => {
        if (canInteract() && elapsed >= REVEAL_MIN_CONTINUE_S && queue.current && !returning)
          finishing = true;
      };
      const controller = {
        get active() {
          return queue.active;
        },
        skip,
        /**
         * Debug/QA: the reveal subject's on-screen bounds as canvas fractions
         * (y down), or null without a matched prop. Precise; call sparingly.
         */
        /** Debug/QA: the clear area the current reveal was framed for, and its distance scale. */
        get framing() {
          return queue.current ? { clearRect, scale: frameScale } : null;
        },
        subjectRect() {
          if (!queue.current || !subject) return null;
          const box = new Box3().setFromObject(subject, true);
          if (box.isEmpty()) return null;
          const cam = ctx.rig.camera;
          cam.updateMatrixWorld();
          const v = new Vector3();
          let x0 = Infinity;
          let x1 = -Infinity;
          let y0 = Infinity;
          let y1 = -Infinity;
          let behind = false;
          for (let i = 0; i < 8; i++) {
            v.set(
              i & 1 ? box.max.x : box.min.x,
              i & 2 ? box.max.y : box.min.y,
              i & 4 ? box.max.z : box.min.z,
            ).project(cam);
            if (v.z > 1) behind = true;
            x0 = Math.min(x0, (v.x + 1) / 2);
            x1 = Math.max(x1, (v.x + 1) / 2);
            y0 = Math.min(y0, (1 - v.y) / 2);
            y1 = Math.max(y1, (1 - v.y) / 2);
          }
          return { x0, x1, y0, y1, behind, distance: cam.position.distanceTo(box.getCenter(v)) };
        },
      };
      ctx.discovery.reveal = controller;
      ctx.expose({ reveal: controller });
      card = new DiscoveryCard(skip, () => {
        if (canInteract() && elapsed >= REVEAL_MIN_CONTINUE_S) {
          readMore = true;
          skip();
        }
      });
      gestures = new RevealGestures(
        ctx.canvas,
        () => !!queue.current && !returning && !finishing && ctx.app.state === 'dive',
      );
      cleanup.add(() => {
        gestures?.dispose();
        gestures = null;
        card.dispose();
        queue.reset();
        ctx.rig.endReveal();
        delete ctx.discovery.reveal;
      });
      cleanup.add(
        ctx.bus.on('scan:complete', (e) => {
          const poi = ctx.discovery.pois.find(
            (p) => p.id === e.poiId && p.landmarkId === e.landmarkId,
          );
          if (poi) queue.enqueue(poi);
        }),
      );
      const clearReveal = (): void => {
        queue.reset();
        card.hide();
        gestures?.reset();
        ctx.rig.endReveal();
        returning = false;
        refit = null;
      };
      cleanup.add(ctx.bus.on('mission:restart', clearReveal));
      cleanup.add(ctx.bus.on('mission:ended', clearReveal));
      // Capture phase prevents a dismissing key from also pausing or moving the boat.
      const dismiss = (event: Event): void => {
        if (!queue.current || !canInteract() || event.type !== 'keydown') return;
        const key = (event as KeyboardEvent).key;
        if (key !== ' ' && key !== 'Enter') return;
        if ((event.target as Element | null)?.closest?.('.discovery-reveal button')) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        skip();
      };
      cleanup.listen(window, 'keydown', dismiss, { capture: true, passive: false });
      let disposed = false;
      cleanup.add(() => {
        disposed = true;
      });
      void Promise.all([ctx.discovery.ready, ctx.propsReady]).then(() => {
        if (!disposed) ready = true;
      });
    },
    frame: {
      'gate.shell': (f, ctx) => {
        interrupted = f.blocked;
        if (ready && ctx.app.state === 'dive' && !ctx.missionRouter?.frozen) {
          const probe = ctx.params.get('reveal');
          if (probe && !probeConsumed) {
            probeConsumed = true;
            const poi = ctx.discovery.pois.find((p) => p.id === probe);
            if (poi) {
              ctx.discovery.store.record(poi.landmarkId, poi.id);
              ctx.journal.refresh();
              queue.enqueue(poi);
            }
          }
          if (!queue.current && !f.blocked && !ctx.photoMode.active) {
            const poi = queue.next();
            if (poi) {
              elapsed = 0;
              autoElapsed = 0;
              captureNow = false;
              gestures?.reset();
              captured = false;
              finishing = false;
              returning = false;
              readMore = false;
              const prop = ctx.props.placed
                .filter(
                  (p) =>
                    Math.hypot(
                      p.root.position.x - poi.position.x,
                      p.root.position.z - poi.position.z,
                    ) <= Math.max(25, Math.min(80, p.sphere.radius)),
                )
                .sort(
                  (a, b) =>
                    a.root.position.distanceToSquared(poi.position) -
                    b.root.position.distanceToSquared(poi.position),
                )[0];
              document.exitPointerLock?.();
              const entry = ctx.discovery.entries.find(
                (e) => e.id === entryIdForPoi(poi, ctx.discovery.entries),
              );
              // A mission's tally is its counted route, the same "N of N" as its debrief.
              const counts = ctx.missionRouter?.mission.counts();
              const tally = ctx.discovery.pois;
              card.show(
                poi.id,
                poi.name,
                entry?.fact ?? revealExcerpt(entry?.paragraphs.join(' ') ?? ''),
                counts?.completed ??
                  tally.filter((p) => ctx.discovery.store.isDiscovered(p.landmarkId, p.id)).length,
                counts?.total ?? tally.length,
                ctx.discovery.siteName,
              );
              subject = prop?.root ?? null;
              refit = (opening = false): void => {
                const canvas = ctx.canvas;
                // Frame for what the card leaves clear, measured now that it is laid out.
                const width = canvas.clientWidth || window.innerWidth;
                const height = canvas.clientHeight || window.innerHeight;
                const bounds = canvas.getBoundingClientRect?.();
                clearRect =
                  (bounds && card.clearRect?.(bounds)) ?? revealVisibleRect(width, height);
                const frame = revealFrame(
                  poi,
                  ctx.sub.position,
                  ctx.rig.camera.fov,
                  ctx.rig.camera.aspect,
                  prop?.sphere,
                  {
                    width,
                    height,
                    baseFovDeg: ctx.config.camera.fovDeg,
                    rect: clearRect,
                    box: subject ? new Box3().setFromObject(subject) : undefined,
                  },
                );
                frameScale = frame.scale;
                frameWidth = width;
                frameHeight = height;
                if (opening) ctx.rig.beginReveal(frame);
                else ctx.rig.reframeReveal(frame);
              };
              refit(true);
              if (!lookHintShown) {
                lookHintShown = true;
                card.showHint();
              }
            }
          }
        }
        if (!queue.active) return;
        if (queue.current) {
          if (
            !returning &&
            ((ctx.canvas.clientWidth || window.innerWidth) !== frameWidth ||
              (ctx.canvas.clientHeight || window.innerHeight) !== frameHeight)
          )
            refit?.();
          if (!f.blocked) {
            elapsed += f.dt;
            gestures?.tick(f.dt);
            // Looking around holds the auto-close until a moment after the last drag.
            const looking =
              !!gestures && (gestures.dragging || gestures.sinceInput < REVEAL_DRAG_GRACE_S);
            if (!looking) autoElapsed += f.dt;
          }
          if (gestures?.used) card.hideHint();
          if (gestures?.pending && !returning && !finishing) {
            // The journal still keeps the authored framing: take it before the first move.
            if (!captured) {
              captureNow = true;
              ctx.rig.revealSettle();
            } else gestures.flush(ctx.rig);
          }
          if (autoElapsed >= REVEAL_AUTO_DISMISS_S) finishing = true;
          if (finishing && captured && !returning) {
            ctx.rig.endReveal();
            returning = true;
          }
          if (returning && !ctx.rig.revealReturning) {
            const poi = queue.current;
            queue.current = null;
            refit = null;
            gestures?.reset();
            card.hide();
            if (readMore) ctx.journal.open(entryIdForPoi(poi, ctx.discovery.entries));
          }
        }
        f.frozen = true;
        f.blocked = true;
        f.shellFrozen = true;
      },
      'render.capture': (_f, ctx) => {
        const poi = queue.current;
        if (!poi || captured) return;
        if (elapsed < REVEAL_STILL_CAPTURE_S && !finishing && !captureNow) return;
        captured = true;
        captureNow = false;
        if (!poi.def.reveal) return;
        stillTarget.copy(poi.position);
        const subjectY = revealStillSubjectY(ctx.rig.camera, stillTarget);
        const image = canvasThumbnail(
          ctx.renderer.domElement,
          // Authored subject crop is at most 4:3, so 480 wide also caps the long side.
          480,
          undefined,
          ctx.progress.cosmetics.frame,
          subjectY,
        );
        if (!image) return;
        const result = ctx.photos.save({
          id: `reveal-${Date.now().toString(36)}-${poi.id}`,
          image,
          framedReveal: true,
          siteId: ctx.contentLandmark,
          siteName: ctx.discovery.siteName,
          poiId: poi.id,
          poiName: poi.name,
          at: new Date().toISOString(),
          depthM: Math.max(0, -poi.position.y),
        });
        if (result.saved) {
          ctx.progress.award('photo', `${ctx.contentLandmark}/${poi.id}`);
          ctx.journal.refresh();
        }
      },
    },
  };
}
