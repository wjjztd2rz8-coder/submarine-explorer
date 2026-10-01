/**
 * Audio (A4) and captions (C5). WebAudio can only start from inside a
 * user-gesture handler, so the engine unlocks on the first keydown or
 * pointerdown rather than at load. `terrain` already satisfies the audio
 * module's minimal TerrainSampler interface (sampleHeight). Audio pauses
 * outside a dive.
 */

import type { SoundSite } from '../../audio/Soundscape.js';
import { AudioSystem } from '../../audio/AudioSystem.js';
import { Captions } from '../../ui/Captions.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';

const cleanup = new Disposables();

export const audioSystem: GameSystem = {
  name: 'audio',
  dispose: () => cleanup.dispose(),
  init(ctx) {
    const { config, bus, terrain, app, settings } = ctx;
    const audio = new AudioSystem(config.audio, bus, terrain);
    ctx.audio = audio;
    audio.setSettings(settings);
    cleanup.add(ctx.save.onChange((next) => audio.setSettings(next)));
    cleanup.add(() => audio.dispose());
    audio.setPaused(app.state !== 'dive');
    cleanup.add(bus.on('app:state', ({ state }) => audio.setPaused(state !== 'dive')));
    ctx.captions = new Captions(audio.captions, {
      enabled: settings.captions,
      maxLines: config.settings.captionMaxLines,
      minDurationS: config.settings.captionMinDurationS,
    });
    const unlockAudio = (): void => audio.unlock();
    cleanup.listen(window, 'pointerdown', unlockAudio, { passive: true });
    cleanup.listen(window, 'keydown', unlockAudio, { passive: true });
    ctx.expose({ audio, captions: ctx.captions });
  },
  frame: {
    'play.audio': (f, ctx) => {
      if (f.frozen) {
        ctx.audio.idle();
        return;
      }
      const s = f.sub;
      const sites: SoundSite[] = [];
      for (const p of ctx.props.placed) {
        const kind = p.def.procedural;
        const sound =
          p.def.feature === 'smoker-cluster' ||
          p.def.feature === 'carbonate-tower' ||
          kind === 'chimney'
            ? 'vent'
            : p.def.feature === 'coral-mound'
              ? 'reef'
              : kind === 'hull-block' || p.def.wreck
                ? 'wreck'
                : null;
        if (sound) sites.push({ id: p.def.id, kind: sound, position: p.root.position });
      }
      ctx.audio.update({
        ratedDepth: s.ratedDepth,
        hullStress: s.hullStress,
        rovMode: ctx.rov.mode,
        tetherUsedM: ctx.rov.tetherUsedM,
        soundSites: sites,
        whaleHabitat: ['monterey-canyon', 'kamaehuakanaloa', 'axial-seamount-ashes'].includes(
          ctx.tileId,
        ),
        depth: s.depth,
        throttle: ctx.rov.deployed ? 0 : f.state.throttle,
        ballast: ctx.rov.deployed ? 0 : f.state.ballast,
        speed: s.speed,
        position: f.pilotPosition,
        forward: f.pilotForward,
        pingPressed: f.state.ping,
      });
    },
  },
};
