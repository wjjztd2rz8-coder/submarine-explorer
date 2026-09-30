/**
 * Placed props (B4, docs/props.md): wrecks, rocks and chimneys from the site's
 * props.json, prop collision, `?at=lat,lon[,heading]` spawns (at `?depth=` if
 * given) and the `?debugProps=1` placement tool.
 */

import { contentUrl, landmarkIdFor } from '../../game/ContentPath.js';
import { Props } from '../../world/Props.js';
import { PlacementDebug } from '../../world/props/PlacementDebug.js';
import { PropContact, atSpawnPose, parseAtParam } from '../../world/props/Wiring.js';
import type { GameSystem } from '../System.js';

export const propsSystem: GameSystem = {
  name: 'props',
  init(ctx) {
    const { meta, terrain, config, scene, params, rig, canvas, route, contentLandmark, bus } = ctx;
    const { sub, spawnDepth } = ctx;
    const props = new Props(meta, terrain, config.props, ctx.tier);
    ctx.props = props;
    scene.add(props.group);
    const propsDebug =
      params.get('debugProps') === '1'
        ? new PlacementDebug(props, scene, rig.camera, canvas, config.props)
        : null;
    ctx.propsDebug = propsDebug;
    const propsLandmark = route ? contentLandmark : landmarkIdFor(params, meta.id);
    void props.load(contentUrl(propsLandmark, 'props.json'), propsLandmark).then((st) => {
      const { landmarkId, count, models, procedural } = st;
      bus.emit('props:loaded', { landmarkId, count, models, procedural });
      if (count || st.skipped) console.info(`[props] ${landmarkId}: ${props.debugString()}`);
      propsDebug?.refresh();
    });
    const at = parseAtParam(params.get('at'));
    if (at) {
      const c = config.props.atSpawnClearanceM;
      const pose = atSpawnPose(at, meta, terrain, spawnDepth, c, config.submarine.hullRadius);
      sub.reset(pose.x, pose.y, pose.z, pose.yaw);
      rig.snap(sub.position, sub.yaw, sub.pitch);
    }
    ctx.propContact = new PropContact(props, bus, config.props, config.submarine.hullRadius);
    ctx.expose({ props, propsDebug });
  },
  frame: {
    // Prop push-out, after physics.
    'sim.contact': (f, ctx) => {
      if (!f.frozen && !ctx.rov.deployed) ctx.propContact.resolve(ctx.sub, f.dt);
    },
    'play.props': (f, ctx) => {
      ctx.props.update(ctx.rig.camera);
      if (f.debugLogDue) console.info(`[props] ${ctx.props.debugString()}`);
    },
  },
};
