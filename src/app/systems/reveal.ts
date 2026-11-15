import {
  REVEAL_AUTO_DISMISS_S,
  REVEAL_MIN_CONTINUE_S,
  REVEAL_STILL_CAPTURE_S,
  RevealQueue,
  revealExcerpt,
  revealFrame,
  revealStillSubjectY,
} from '../../game/Reveal.js';
import { entryIdForPoi } from '../../game/Guide.js';
import { DiscoveryCard } from '../../ui/DiscoveryCard.js';
import { canvasThumbnail } from '../../ui/PhotoMode.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';
import { Vector3 } from 'three';

export function createRevealSystem(): GameSystem {
  const cleanup = new Disposables();
  const queue = new RevealQueue();
  let elapsed = 0;
  let captured = false;
  let finishing = false;
  let returning = false;
  let readMore = false;
  let ready = false;
  let probeConsumed = false;
  let card: DiscoveryCard;
  const stillTarget = new Vector3();
  const skip = (): void => {
    if (elapsed >= REVEAL_MIN_CONTINUE_S && queue.current && !returning) finishing = true;
  };
  return {
    name: 'reveal',
    dispose: () => cleanup.dispose(),
    init(ctx) {
      const controller = {
        get active() {
          return queue.active;
        },
        skip,
      };
      ctx.discovery.reveal = controller;
      ctx.expose({ reveal: controller });
      card = new DiscoveryCard(skip, () => {
        if (elapsed >= REVEAL_MIN_CONTINUE_S) {
          readMore = true;
          skip();
        }
      });
      cleanup.add(() => {
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
        ctx.rig.endReveal();
        returning = false;
      };
      cleanup.add(ctx.bus.on('mission:restart', clearReveal));
      cleanup.add(ctx.bus.on('mission:ended', clearReveal));
      // Capture phase prevents a dismissing key from also pausing or moving the boat.
      const dismiss = (event: Event): void => {
        if (!queue.current || event.type !== 'keydown') return;
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
              const frame = revealFrame(
                poi,
                ctx.sub.position,
                ctx.rig.camera.fov,
                ctx.rig.camera.aspect,
                prop?.sphere,
              );
              ctx.rig.beginReveal(frame);
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
            }
          }
        }
        if (!queue.active) return;
        if (queue.current) {
          if (!f.blocked) elapsed += f.dt;
          if (elapsed >= REVEAL_AUTO_DISMISS_S) finishing = true;
          if (finishing && captured && !returning) {
            ctx.rig.endReveal();
            returning = true;
          }
          if (returning && !ctx.rig.revealReturning) {
            const poi = queue.current;
            queue.current = null;
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
        if (!poi || captured || (elapsed < REVEAL_STILL_CAPTURE_S && !finishing)) return;
        captured = true;
        if (!poi.def.reveal) return;
        stillTarget.copy(poi.position);
        const subjectY = revealStillSubjectY(ctx.rig.camera, stillTarget);
        const image = canvasThumbnail(
          ctx.renderer.domElement,
          undefined,
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
