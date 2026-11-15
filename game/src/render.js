// Astro Post — all canvas drawing: starfield, stations, parcel, asteroids,
// drones, the courier ship, particles, HUD and the title / pause / end screens.
import { FIELD, COLORS, STATIONS, PARCELS_TO_WIN, PLAYER } from './config.js';
import { mulberry32, range } from './random.js';
import {
  STATUS_TITLE,
  STATUS_PLAY,
  STATUS_OVER,
  STATUS_WIN,
} from './world.js';

export const SCREEN_TITLE = STATUS_TITLE;
export const SCREEN_PLAY = STATUS_PLAY;
export const SCREEN_OVER = STATUS_OVER;
export const SCREEN_WIN = STATUS_WIN;

// Fixed backdrop, generated once from a fixed seed so every frame matches.
const backdropRng = mulberry32(20261115);
const STARS = Array.from({ length: 150 }, () => ({
  x: range(backdropRng, 0, FIELD.width),
  y: range(backdropRng, 0, FIELD.height),
  r: range(backdropRng, 0.6, 2.1),
  tw: range(backdropRng, 0, Math.PI * 2),
}));
const NEBULAE = [
  { x: 260, y: 170, r: 260, color: 'rgba(64,48,160,0.20)' },
  { x: 1050, y: 520, r: 300, color: 'rgba(16,110,120,0.18)' },
  { x: 700, y: 90, r: 200, color: 'rgba(150,40,90,0.14)' },
];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, time) {
  ctx.fillStyle = '#070b1d';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  for (const n of NEBULAE) {
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    g.addColorStop(0, n.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
  }
  for (const s of STARS) {
    const a = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(time * 1.4 + s.tw));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#dfe8ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawStation(ctx, st, carrying, time, flashing) {
  const c = COLORS[st.color];
  const pulse = carrying === st.color ? 1 + 0.08 * Math.sin(time * 5) : 1;
  const r = 46 * pulse;
  ctx.save();
  ctx.shadowColor = c.glow;
  ctx.shadowBlur = flashing ? 34 : 18;
  ctx.strokeStyle = flashing ? '#ff5d5d' : c.main;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(st.x, st.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(10,16,38,0.85)';
  ctx.beginPath();
  ctx.arc(st.x, st.y, r - 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = c.dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(st.x, st.y, r - 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = c.main;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(c.name[0], st.x, st.y - 4);
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#c8d4f2';
  ctx.fillText(c.name, st.x, st.y + 16);
  ctx.restore();
}

function drawParcel(ctx, parcel, time) {
  const c = COLORS[parcel.color];
  const bob = Math.sin(time * 3 + parcel.x) * 4;
  const y = parcel.y + bob;
  ctx.save();
  ctx.translate(parcel.x, y);
  ctx.rotate(Math.sin(time * 2) * 0.25);
  ctx.shadowColor = c.glow;
  ctx.shadowBlur = 22;
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(13, 0);
  ctx.lineTo(0, 16);
  ctx.lineTo(-13, 0);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(6, 0);
  ctx.lineTo(0, 9);
  ctx.lineTo(-6, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawAsteroid(ctx, a) {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.rot);
  ctx.fillStyle = '#5d6474';
  ctx.strokeStyle = '#3a4152';
  ctx.lineWidth = 2;
  ctx.beginPath();
  a.verts.forEach((v, i) => {
    const x = Math.cos(v.a) * v.r;
    const y = Math.sin(v.a) * v.r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#484f5e';
  for (const cr of a.craters) {
    ctx.beginPath();
    ctx.arc(cr.dx, cr.dy, cr.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawDrone(ctx, d, time) {
  const y = d.baseY + Math.sin(d.phase) * 14;
  ctx.save();
  ctx.translate(d.x, y);
  ctx.shadowColor = 'rgba(255,60,60,0.6)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#c22f3d';
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(-8, -11);
  ctx.lineTo(12, -8);
  ctx.lineTo(20, 0);
  ctx.lineTo(12, 8);
  ctx.lineTo(-8, 11);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(d.dir > 0 ? 6 : -6, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer(ctx, world, time) {
  const p = world.player;
  const s = world.state;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (s.invuln > 0 && Math.floor(time * 12) % 2 === 0) ctx.globalAlpha = 0.45;
  ctx.rotate(p.angle);
  if (p.thrusting) {
    const flick = 14 + Math.sin(time * 40) * 6;
    const g = ctx.createLinearGradient(-14, 0, -14 - flick, 0);
    g.addColorStop(0, 'rgba(255,190,80,0.95)');
    g.addColorStop(1, 'rgba(255,80,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-12, -6);
    ctx.lineTo(-14 - flick, 0);
    ctx.lineTo(-12, 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.shadowColor = 'rgba(120,200,255,0.7)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#e8f2ff';
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-12, -11);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-12, 11);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#2b6cb0';
  ctx.beginPath();
  ctx.arc(4, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Carried parcel rides above the ship.
  if (s.carrying !== -1) {
    const c = COLORS[s.carrying];
    ctx.save();
    ctx.shadowColor = c.glow;
    ctx.shadowBlur = 14;
    ctx.fillStyle = c.main;
    ctx.beginPath();
    ctx.arc(p.x, p.y - 26, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (s.invuln > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(140,220,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawParticles(ctx, world) {
  for (const pt of world.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTexts(ctx, world) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of world.texts) {
    ctx.globalAlpha = Math.min(1, t.life);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = t.color;
    // Keep score popups clear of the HUD strip and the field edges.
    const tx = Math.max(90, Math.min(FIELD.width - 90, t.x));
    const ty = Math.max(100, Math.min(FIELD.height - 20, t.y));
    ctx.fillText(t.text, tx, ty);
  }
  ctx.globalAlpha = 1;
}

function drawHeart(ctx, x, y, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = filled ? '#ff5d73' : 'rgba(255,93,115,0.25)';
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-11, -4, -6, -12, 0, -5);
  ctx.bezierCurveTo(6, -12, 11, -4, 0, 6);
  ctx.fill();
  ctx.restore();
}

function drawHud(ctx, world, best) {
  const s = world.state;
  ctx.save();
  ctx.textBaseline = 'top';
  // Score, top left.
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8f2ff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`SCORE ${s.score.toLocaleString('en-US')}`, 18, 14);
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = '#9fb2d8';
  ctx.fillText(`BEST ${Math.max(best, s.score).toLocaleString('en-US')}`, 18, 46);
  // Parcels, top centre.
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = '#e8f2ff';
  ctx.fillText(`PARCELS ${s.delivered} / ${PARCELS_TO_WIN}`, FIELD.width / 2, 16);
  for (let i = 0; i < PARCELS_TO_WIN; i += 1) {
    ctx.fillStyle = i < s.delivered ? '#7CFC9A' : 'rgba(232,242,255,0.22)';
    ctx.beginPath();
    ctx.arc(FIELD.width / 2 - 99 + i * 22, 48, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Hearts + boost + timer, top right.
  for (let i = 0; i < PLAYER.hearts; i += 1) {
    drawHeart(ctx, FIELD.width - 30 - i * 30, 30, i < s.hearts);
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = '#9fb2d8';
  ctx.font = 'bold 13px sans-serif';
  const mins = Math.floor(s.time / 60);
  const secs = Math.floor(s.time % 60);
  ctx.fillText(`TIME ${mins}:${String(secs).padStart(2, '0')}`, FIELD.width - 18, 52);
  // Boost bar and the parcel hint only make sense while flying.
  if (s.status === STATUS_PLAY) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#9fb2d8';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('BOOST  [SPACE / CLICK]', 18, FIELD.height - 34);
    ctx.fillStyle = 'rgba(232,242,255,0.18)';
    roundRect(ctx, 18, FIELD.height - 18, 180, 10, 5);
    ctx.fill();
    ctx.fillStyle = s.boost >= PLAYER.boostCost ? '#38bdf8' : '#64748b';
    roundRect(ctx, 18, FIELD.height - 18, 180 * (s.boost / PLAYER.boostMax), 10, 5);
    ctx.fill();
    // Carried parcel hint, bottom centre.
    if (s.carrying !== -1) {
      const c = COLORS[s.carrying];
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = c.main;
      const st = STATIONS[s.carrying];
      const where = st.color === 0 ? 'top-left' : st.color === 1 ? 'top-right' : 'bottom';
      ctx.fillText(`CARRYING ${c.name}  →  DELIVER TO THE ${where.toUpperCase()} DOCK`, FIELD.width / 2, FIELD.height - 36);
    } else if (world.parcel) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = COLORS[world.parcel.color].main;
      ctx.fillText(`PICK UP THE ${COLORS[world.parcel.color].name} PARCEL`, FIELD.width / 2, FIELD.height - 36);
    }
  }
  // Combo badge.
  if (s.combo >= 2) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#ffd166';
    ctx.fillText(`COMBO x${s.combo}`, FIELD.width / 2, 84);
  }
  ctx.restore();
}

function overlay(ctx, title, lines, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(4,8,22,0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = accent;
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#f4f8ff';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText(title, FIELD.width / 2, 218);
  ctx.shadowBlur = 0;
  let y = 300;
  ctx.font = '20px sans-serif';
  for (const line of lines) {
    ctx.fillStyle = line.color || '#c8d4f2';
    ctx.font = (line.bold ? 'bold ' : '') + (line.size || 20) + 'px sans-serif';
    ctx.fillText(line.text, FIELD.width / 2, y);
    y += line.gap || 34;
  }
  ctx.restore();
}

export function draw(ctx, world, opts) {
  const { paused = false, best = 0, muted = false } = opts || {};
  const s = world.state;
  const time = s.time;
  ctx.save();
  if (s.shake > 0) {
    ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
  }
  drawBackground(ctx, time);
  for (const st of STATIONS) {
    drawStation(ctx, st, s.carrying, time, s.flashStation === st.color);
  }
  if (world.parcel) drawParcel(ctx, world.parcel, time);
  for (const a of world.asteroids) drawAsteroid(ctx, a);
  for (const d of world.drones) drawDrone(ctx, d, time);
  drawParticles(ctx, world);
  drawPlayer(ctx, world, time);
  drawTexts(ctx, world);
  ctx.restore();

  if (s.status === STATUS_PLAY || s.status === STATUS_OVER || s.status === STATUS_WIN) {
    drawHud(ctx, world, best);
  }
  if (muted) {
    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#9fb2d8';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('MUTED (M)', FIELD.width - 18, FIELD.height - 34);
    ctx.restore();
  }

  if (s.status === STATUS_TITLE) {
    overlay(ctx, 'ASTRO POST', [
      { text: '—  PARCEL RUN  —', color: '#7dd3fc', bold: true, size: 22 },
      { text: 'Fly the courier ship. Pick up each parcel and dock it at the', gap: 30 },
      { text: 'station of the same colour. 10 deliveries wins the run.', gap: 30 },
      { text: 'Dodge the asteroids and the patrol drones — 3 hull hits and the run is over.', gap: 44 },
      { text: 'WASD / ARROWS thrust      SPACE or CLICK boost      P pause      M mute', color: '#ffd166', size: 17, gap: 52 },
      { text: best > 0 ? `BEST SCORE  ${best.toLocaleString('en-US')}` : ' ', color: '#7CFC9A', bold: true, gap: 40 },
      { text: 'PRESS ENTER OR CLICK TO LAUNCH', color: '#ffffff', bold: true, size: 22 },
    ], 'rgba(56,189,248,0.8)');
  } else if (paused) {
    overlay(ctx, 'PAUSED', [
      { text: 'Take a breath, courier. The parcels will wait.', gap: 40 },
      { text: 'P  resume      R  restart      M  mute', color: '#ffd166', size: 18 },
    ], 'rgba(148,163,184,0.8)');
  } else if (s.status === STATUS_OVER) {
    overlay(ctx, 'SHIP LOST', [
      { text: `Score ${s.score.toLocaleString('en-US')}   •   Parcels delivered ${s.delivered} / ${PARCELS_TO_WIN}   •   Best combo x${s.bestCombo}`, gap: 40 },
      { text: 'The post office sends its regards — and a fresh ship.', color: '#c8d4f2', gap: 52 },
      { text: 'PRESS R TO FLY AGAIN', color: '#ffffff', bold: true, size: 22 },
    ], 'rgba(255,93,115,0.8)');
  } else if (s.status === STATUS_WIN) {
    const mins = Math.floor(s.time / 60);
    const secs = Math.floor(s.time % 60);
    overlay(ctx, 'ROUTE COMPLETE!', [
      { text: `All ${PARCELS_TO_WIN} parcels delivered in ${mins}:${String(secs).padStart(2, '0')}`, gap: 36 },
      { text: `Score ${s.score.toLocaleString('en-US')}   •   Best combo x${s.bestCombo}   •   Hull hits taken ${s.hits}`, gap: 40 },
      { text: 'Every parcel home. The orbitals are yours, courier.', color: '#7CFC9A', gap: 52 },
      { text: 'PRESS R TO FLY AGAIN', color: '#ffffff', bold: true, size: 22 },
    ], 'rgba(124,252,154,0.8)');
  }
}
