// Keyboard + mouse input. The world reads one control object per step:
// { tx, ty } is the thrust direction (-1..1 each), boost is true on the frame
// the player fires the boost, mx/my is the mouse position in field pixels and
// mouseFresh is true while the mouse moved in the last 1.5 s.
const keys = new Set();
const mouse = { x: 0, y: 0, freshUntil: 0, clicked: false };
let boostQueued = false;
let attached = false;

const THRUST_KEYS = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
};

export function attachInput(canvas) {
  if (attached) return;
  attached = true;
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space') boostQueued = true;
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 1280;
    mouse.y = ((event.clientY - rect.top) / rect.height) * 720;
    mouse.freshUntil = performance.now() + 1500;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      mouse.clicked = true;
      boostQueued = true;
    }
  });
}

export function pressed(code) {
  return keys.has(code);
}

export function consumeKey(code) {
  if (!keys.has(code)) return false;
  keys.delete(code);
  return true;
}

export function pollInput(nowMs) {
  let tx = 0;
  let ty = 0;
  for (const [code, dir] of Object.entries(THRUST_KEYS)) {
    if (keys.has(code)) {
      tx += dir[0];
      ty += dir[1];
    }
  }
  const len = Math.hypot(tx, ty);
  if (len > 0) {
    tx /= len;
    ty /= len;
  }
  const out = {
    tx,
    ty,
    boost: boostQueued,
    mx: mouse.x,
    my: mouse.y,
    mouseFresh: nowMs < mouse.freshUntil,
  };
  boostQueued = false;
  mouse.clicked = false;
  return out;
}
