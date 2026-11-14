import { RevealQueue, revealExcerpt, revealFrame } from '../../game/Reveal.js';
import { entryIdForPoi } from '../../game/Guide.js';
import { DiscoveryCard } from '../../ui/DiscoveryCard.js';
import { canvasThumbnail } from '../../ui/PhotoMode.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';

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
  const skip = (): void => {
    if (elapsed >= 1 && queue.current && !returning) finishing = true;
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
        if (elapsed >= 1) {
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
      cleanup.add(
        ctx.bus.on('mission:restart', () => {
          queue.reset();
          card.hide();
          ctx.rig.endReveal();
          returning = false;
        }),
      );
      // Capture phase prevents a dismissing key from also pausing or moving the boat.
      const dismiss = (event: Event): void => {
        if (!queue.current) return;
        if (
          event.type !== 'keydown' &&
          (event.target as Element | null)?.closest?.('.discovery-reveal button')
        )
          return;
        event.preventDefault();
        event.stopImmediatePropagation();
        skip();
      };
      for (const name of ['keydown', 'pointerdown', 'click', 'touchstart', 'wheel'])
        cleanup.listen(window, name, dismiss, { capture: true, passive: false });
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
              card.show(
                poi.id,
                poi.name,
                entry?.fact ?? revealExcerpt(entry?.paragraphs.join(' ') ?? ''),
                ctx.discovery.pois.filter((p) =>
                  ctx.discovery.store.isDiscovered(p.landmarkId, p.id),
                ).length,
                ctx.discovery.pois.length,
                ctx.discovery.siteName,
              );
            }
          }
        }
        if (!queue.active) return;
        if (queue.current) {
          elapsed += f.dt;
          if (elapsed >= 6) finishing = true;
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
        if (!poi || captured || (elapsed < 3 && !finishing)) return;
        captured = true;
        const image = canvasThumbnail(
          ctx.renderer.domElement,
          undefined,
          undefined,
          ctx.progress.cosmetics.frame,
        );
        if (!image) return;
        const result = ctx.photos.save({
          id: `reveal-${Date.now().toString(36)}-${poi.id}`,
          image,
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
