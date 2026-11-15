// Deterministic screenshot scenes behind ?shot=start|play|win|end. Each one
// plays the real rules forward from a fresh world for a fixed number of steps,
// steered by a simple autopilot, so the frame is what a short game really
// looks like and the same seed always gives the same frame.
import { FIELD, STEP, STATIONS } from './config.js';
import { STATUS_OVER, STATUS_PLAY, STATUS_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

function objective(world) {
  const s = world.state;
  if (s.carrying !== -1) return STATIONS[s.carrying];
  if (world.parcel) return world.parcel;
  return { x: FIELD.width / 2, y: FIELD.height / 2 };
}

/**
 * One autopilot step. The careful pilot predicts: where will the ship be in
 * 0.6 s, and where will each rock and drone be? If anything comes within
 * 90 px of that future point, it steers mostly away from the threat and
 * only a little toward the objective, and never boosts into danger.
 * The reckless pilot ignores all of that and boosts whenever it can.
 */
function autopilot(world, reckless) {
  const p = world.player;
  const s = world.state;
  const target = objective(world);
  let dx = target.x - p.x;
  let dy = target.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  let threatD = Infinity;
  if (!reckless) {
    const px = p.x + p.vx * 0.6;
    const py = p.y + p.vy * 0.6;
    let threat = null;
    for (const a of world.asteroids) {
      const ax = a.x + a.vx * 0.6;
      const ay = a.y + a.vy * 0.6;
      const d = Math.hypot(ax - px, ay - py) - a.radius;
      if (d < threatD) {
        threatD = d;
        threat = { x: ax, y: ay };
      }
    }
    for (const d of world.drones) {
      const dy2 = d.baseY + Math.sin(d.phase + 1.2) * 14;
      const dd = Math.hypot(d.x - px, dy2 - py) - d.radius;
      if (dd < threatD) {
        threatD = dd;
        threat = { x: d.x, y: dy2 };
      }
    }
    if (threat && threatD < 90) {
      const ax = px - threat.x;
      const ay = py - threat.y;
      const al = Math.hypot(ax, ay) || 1;
      dx = (ax / al) * 1.6 + dx * 0.4;
      dy = (ay / al) * 1.6 + dy * 0.4;
    }
  }
  const n = Math.hypot(dx, dy) || 1;
  const dist = Math.hypot(target.x - p.x, target.y - p.y);
  const boost = reckless
    ? s.boost >= 30
    : dist > 300 && threatD > 130 && s.boost > 55;
  return { tx: dx / n, ty: dy / n, boost, mx: p.x, my: p.y, mouseFresh: false };
}

function runFor(world, seconds, pilot) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (world.state.status !== STATUS_PLAY) break;
    world.step(STEP, pilot(world));
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show. Scenes: start (title), play, win, end.
 */
export function stageShot(name, world, seed) {
  if (name === 'play') {
    world.reset(seed ?? 11);
    world.begin();
    runFor(world, PLAY_SECONDS, (w) => autopilot(w, false));
    const over = world.state.status === STATUS_OVER;
    const won = world.state.status === STATUS_WIN;
    return { screen: over ? SCREEN_OVER : won ? SCREEN_WIN : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'win') {
    world.reset(seed ?? 13);
    world.begin();
    runFor(world, LIMIT_SECONDS, (w) => autopilot(w, false));
    return { screen: world.state.status === STATUS_WIN ? SCREEN_WIN : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    world.reset(seed ?? 23);
    world.begin();
    runFor(world, LIMIT_SECONDS, (w) => autopilot(w, true));
    return { screen: world.state.status === STATUS_OVER ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  // start: a lively title backdrop, asteroids drifting for a few seconds.
  world.reset(seed ?? 7);
  for (let i = 0; i < START_SECONDS / STEP; i += 1) {
    world.step(STEP, { tx: 0, ty: 0, boost: false, mx: 0, my: 0, mouseFresh: false });
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
