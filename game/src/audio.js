// Tiny WebAudio synth for game sounds. Everything is generated — no audio
// files, no network. The context is created only after the first real user
// gesture, so screenshot runs and headless runs stay silent and never throw.
let ctx = null;
let master = null;
let muted = false;
let unlocked = false;

function ensure() {
  if (ctx || muted || !unlocked) return false;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    return true;
  } catch {
    return false;
  }
}

function tone(freq, dur, type, vol, slideTo) {
  if (!ensure()) return;
  try {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {
    // Sound must never break the game.
  }
}

function noise(dur, vol) {
  if (!ensure()) return;
  try {
    const t0 = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  } catch {
    // Sound must never break the game.
  }
}

export const sfx = {
  unlock() {
    unlocked = true;
    ensure();
  },
  click() {
    tone(660, 0.07, 'square', 0.12);
  },
  pickup() {
    tone(520, 0.09, 'sine', 0.2, 780);
  },
  deliver() {
    tone(523, 0.1, 'triangle', 0.22);
    setTimeout(() => tone(659, 0.1, 'triangle', 0.22), 70);
    setTimeout(() => tone(784, 0.16, 'triangle', 0.22), 140);
  },
  hit() {
    noise(0.25, 0.5);
    tone(110, 0.25, 'sawtooth', 0.25, 55);
  },
  boost() {
    noise(0.18, 0.25);
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.25), i * 110));
  },
  lose() {
    [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'sawtooth', 0.18), i * 130));
  },
  toggleMute() {
    muted = !muted;
    return muted;
  },
  isMuted() {
    return muted;
  },
};

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => sfx.unlock(), { once: false });
  window.addEventListener('keydown', () => sfx.unlock(), { once: false });
}
