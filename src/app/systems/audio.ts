/**
 * Audio (A4) and captions (C5). WebAudio can only start from inside a
 * user-gesture handler, so the engine unlocks on the first keydown or
 * pointerdown rather than at load. `terrain` already satisfies the audio
 * module's minimal TerrainSampler interface (sampleHeight). Audio pauses
 * outside a dive.
 */

import { AudioSystem } from '../../audio/AudioSystem.js';
import { Captions } from '../../ui/Captions.js';
import type { GameSystem } from '../System.js';

export const audioSystem: GameSystem = {
  name: 'audio',
  init(ctx) {
    const { config, bus, terrain, app, settings } = ctx;
    const audio = new AudioSystem(config.audio, bus, terrain);
    ctx.audio = audio;
    audio.setPaused(app.state !== 'dive');
    bus.on('app:state', ({ state }) => audio.setPaused(state !== 'dive'));
    ctx.captions = new Captions(audio.captions, {
      enabled: settings.captions,
      maxLines: config.settings.captionMaxLines,
      minDurationS: config.settings.captionMinDurationS,
    });
    const unlockAudio = (): void => audio.unlock();
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    ctx.expose({ audio, captions: ctx.captions });
  },
  frame: {
    'play.audio': (f, ctx) => {
      if (f.frozen) return;
      const s = f.sub;
      ctx.audio.update({
        depth: s.depth,
        throttle: ctx.rov.deployed ? 0 : f.state.throttle,
        ballast: ctx.rov.deployed ? 0 : f.state.ballast,
        speed: s.speed,
        position: ctx.sub.position,
        forward: f.forward,
        pingPressed: f.state.ping,
      });
    },
  },
};
