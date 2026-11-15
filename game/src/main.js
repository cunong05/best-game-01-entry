// Astro Post — wiring: fixed-timestep loop, screen state, keyboard shortcuts
// and the deterministic ?shot= scenes used for screenshots.
import { FIELD, STEP } from './config.js';
import { World, STATUS_TITLE, STATUS_PLAY, STATUS_OVER, STATUS_WIN } from './world.js';
import { draw } from './render.js';
import { stageShot } from './shots.js';
import { attachInput, pollInput, consumeKey } from './input.js';
import { sfx } from './audio.js';

const canvas = document.getElementById('game');
canvas.width = FIELD.width;
canvas.height = FIELD.height;
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const world = new World();
let paused = false;
let best = 0;
try {
  best = Number(localStorage.getItem('astro-post-best') || 0) || 0;
} catch {
  best = 0;
}

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function launch() {
  const seed = (Date.now() % 100000) | 0;
  world.reset(seed);
  world.begin();
  paused = false;
  sfx.unlock();
  sfx.click();
  announce('Astro Post: run started. Deliver 10 parcels.');
}

function restart() {
  launch();
}

function frame() {
  const now = performance.now();
  const ctrl = pollInput(now);
  if (consumeKey('Enter')) {
    if (world.state.status === STATUS_TITLE) launch();
  }
  if (consumeKey('KeyR')) {
    if (world.state.status !== STATUS_TITLE) restart();
  }
  if (consumeKey('KeyP')) {
    if (world.state.status === STATUS_PLAY) {
      paused = !paused;
      announce(paused ? 'Paused.' : 'Resumed.');
    }
  }
  if (consumeKey('KeyM')) {
    const muted = sfx.toggleMute();
    announce(muted ? 'Sound muted.' : 'Sound on.');
  }
  if (world.state.status === STATUS_TITLE && (ctrl.boost || pollClick())) {
    launch();
  }
  if (!paused && world.state.status === STATUS_PLAY) {
    world.step(STEP, ctrl);
    if (world.state.status === STATUS_OVER || world.state.status === STATUS_WIN) {
      if (world.state.score > best) {
        best = world.state.score;
        try {
          localStorage.setItem('astro-post-best', String(best));
        } catch {
          // Best score is a nicety, never a failure.
        }
      }
      announce(
        world.state.status === STATUS_WIN
          ? `Route complete! Score ${world.state.score}.`
          : `Ship lost. Score ${world.state.score}. Press R to fly again.`,
      );
    }
  }
  draw(ctx, world, { paused, best, muted: sfx.isMuted() });
}

// Click-to-launch on the title screen: pollInput already consumed the click
// as a boost request, so track it separately through a one-frame flag.
let clickSeen = false;
canvas.addEventListener('mousedown', () => {
  clickSeen = true;
});
function pollClick() {
  const c = clickSeen;
  clickSeen = false;
  return c;
}

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  const seedParam = Number(params.get('seed'));
  const staged = stageShot(shot, world, Number.isFinite(seedParam) ? seedParam : undefined);
  if (staged.best > best) best = staged.best;
  draw(ctx, world, { paused: false, best, muted: true });
  document.title = `Astro Post — shot ${shot}`;
  window.__shot = { name: shot, screen: staged.screen, score: world.state.score, best };
} else {
  attachInput(canvas);
  let last = performance.now();
  let acc = 0;
  function loop(now) {
    acc += Math.min(0.25, (now - last) / 1000);
    last = now;
    while (acc >= STEP) {
      frame();
      acc -= STEP;
    }
    requestAnimationFrame(loop);
  }
  draw(ctx, world, { paused: false, best, muted: sfx.isMuted() });
  requestAnimationFrame(loop);
}

window.__game = { world, launch, restart };
