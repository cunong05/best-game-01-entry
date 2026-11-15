// Astro Post — the simulation. One World holds everything that changes:
// the courier ship, parcels, stations, asteroids, patrol drones, particles,
// floating score text and the run's score. It steps at a fixed 1/60 s and is
// fully deterministic from its seed, which is what makes the screenshot
// scenes reproducible.
import {
  FIELD,
  STEP,
  PARCELS_TO_WIN,
  PLAYER,
  COLORS,
  STATIONS,
  PARCEL_LIFETIME,
  ASTEROID_BASE,
  ASTEROID_PER_THREE,
  DRONE_LANES,
} from './config.js';
import { mulberry32, range, int, angle } from './random.js';
import { sfx } from './audio.js';

export const STATUS_TITLE = 'title';
export const STATUS_PLAY = 'play';
export const STATUS_OVER = 'over';
export const STATUS_WIN = 'win';

const TAU = Math.PI * 2;

function makeAsteroid(rng, margin) {
  const radius = range(rng, 14, 36);
  const speed = range(rng, 20, 52);
  const dir = angle(rng);
  // Spawn away from the centre so the player never starts inside a rock.
  let x = range(rng, margin, FIELD.width - margin);
  let y = range(rng, margin, FIELD.height - margin);
  if (Math.hypot(x - FIELD.width / 2, y - FIELD.height / 2) < 220) {
    x = range(rng, margin, 260);
    y = range(rng, margin, 260);
  }
  const verts = [];
  const count = int(rng, 8, 11);
  for (let i = 0; i < count; i += 1) {
    verts.push({ a: (i / count) * TAU, r: radius * range(rng, 0.72, 1.15) });
  }
  return {
    x, y, radius, speed,
    vx: Math.cos(dir) * speed,
    vy: Math.sin(dir) * speed,
    rot: angle(rng),
    rotSpeed: range(rng, -0.9, 0.9),
    verts,
    craters: Array.from({ length: 3 }, () => ({ dx: range(rng, -0.4, 0.4) * radius, dy: range(rng, -0.4, 0.4) * radius, r: range(rng, 2, 5) })),
  };
}

function makeDrone(rng, laneY, level) {
  return {
    x: range(rng, 160, FIELD.width - 160),
    y: laneY,
    baseY: laneY,
    dir: rng() < 0.5 ? -1 : 1,
    speed: Math.min(120, 50 + level * 5),
    phase: range(rng, 0, TAU),
    radius: 17,
  };
}

export class World {
  constructor() {
    this.reset(1);
  }

  reset(seed) {
    this.seed = seed >>> 0;
    this.rng = mulberry32(this.seed);
    this.state = {
      status: STATUS_TITLE,
      time: 0,
      score: 0,
      delivered: 0,
      combo: 0,
      bestCombo: 0,
      hearts: PLAYER.hearts,
      invuln: 0,
      boost: PLAYER.boostMax,
      carrying: -1,
      parcelAge: 0,
      shake: 0,
      flashStation: -1,
      flashTime: 0,
      hits: 0,
      boosts: 0,
      pickups: 0,
    };
    this.player = {
      x: FIELD.width / 2,
      y: FIELD.height / 2 + 60,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      thrusting: false,
    };
    this.parcel = null;
    this.asteroids = [];
    this.drones = [];
    this.particles = [];
    this.texts = [];
    this.spawnParcel();
    this.rebuildHazards();
  }

  begin() {
    this.state.status = STATUS_PLAY;
  }

  asteroidTarget() {
    return ASTEROID_BASE + Math.floor(this.state.delivered / 3) * ASTEROID_PER_THREE;
  }

  rebuildHazards() {
    while (this.asteroids.length < this.asteroidTarget()) {
      this.asteroids.push(makeAsteroid(this.rng, 40));
    }
    this.drones = DRONE_LANES.map((laneY) => makeDrone(this.rng, laneY, this.state.delivered));
  }

  spawnParcel() {
    const color = int(this.rng, 0, COLORS.length - 1);
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 24; tries += 1) {
      x = range(this.rng, 60, FIELD.width - 60);
      y = range(this.rng, 60, FIELD.height - 60);
      const farFromPlayer = Math.hypot(x - this.player.x, y - this.player.y) > 280;
      const farFromStations = STATIONS.every((s) => Math.hypot(x - s.x, y - s.y) > 130);
      if (farFromPlayer && farFromStations) break;
    }
    this.parcel = { x, y, color, born: this.state.time };
    this.state.parcelAge = 0;
  }

  addText(x, y, text, color) {
    this.texts.push({ x, y, text, color, life: 1.4 });
  }

  burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const a = this.rng() * TAU;
      const v = range(this.rng, speed * 0.3, speed);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: range(this.rng, 0.4, 0.9),
        max: 0.9,
        radius: range(this.rng, 2, 4.5),
        color,
      });
    }
  }

  damage(fromX, fromY) {
    const s = this.state;
    if (s.invuln > 0 || s.status !== STATUS_PLAY) return;
    s.hearts -= 1;
    s.hits += 1;
    s.combo = 0;
    s.invuln = PLAYER.invulnSeconds;
    const dx = this.player.x - fromX;
    const dy = this.player.y - fromY;
    const len = Math.hypot(dx, dy) || 1;
    this.player.vx += (dx / len) * 300;
    this.player.vy += (dy / len) * 300;
    this.burst(this.player.x, this.player.y, '#ff5d5d', 26, 260);
    this.addText(this.player.x, this.player.y - 30, 'HULL HIT!', '#ff7070');
    s.shake = 12;
    sfx.hit();
    if (s.hearts <= 0) {
      s.status = STATUS_OVER;
      this.burst(this.player.x, this.player.y, '#ffb020', 50, 380);
      this.burst(this.player.x, this.player.y, '#ffffff', 30, 300);
      sfx.lose();
    }
  }

  deliver(station) {
    const s = this.state;
    const speedBonus = Math.max(0, Math.round(500 - this.state.parcelAge * 12));
    s.combo += 1;
    s.bestCombo = Math.max(s.bestCombo, s.combo);
    const gained = 1000 + speedBonus + s.combo * 150;
    s.score += gained;
    s.delivered += 1;
    s.pickups += 1;
    this.addText(station.x, station.y - 56, `+${gained}`, '#7CFC9A');
    if (s.combo >= 2) this.addText(station.x, station.y - 80, `COMBO x${s.combo}`, '#ffd166');
    this.burst(station.x, station.y, COLORS[station.color].main, 30, 240);
    s.carrying = -1;
    this.parcel = null;
    sfx.deliver();
    if (s.delivered >= PARCELS_TO_WIN) {
      s.status = STATUS_WIN;
      sfx.win();
      return;
    }
    this.spawnParcel();
    this.rebuildHazards();
  }

  step(dt, ctrl) {
    const s = this.state;
    const p = this.player;
    // Ambient drift keeps the title screen alive behind the menu.
    for (const a of this.asteroids) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.rot += a.rotSpeed * dt;
      if (a.x < -60) a.x = FIELD.width + 50;
      if (a.x > FIELD.width + 60) a.x = -50;
      if (a.y < -60) a.y = FIELD.height + 50;
      if (a.y > FIELD.height + 60) a.y = -50;
    }
    for (const d of this.drones) {
      d.x += d.dir * d.speed * dt;
      d.phase += dt * 2;
      if (d.x < 120) { d.x = 120; d.dir = 1; }
      if (d.x > FIELD.width - 120) { d.x = FIELD.width - 120; d.dir = -1; }
    }
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.98;
      pt.vy *= 0.98;
      pt.life -= dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i -= 1) {
      const t = this.texts[i];
      t.y -= 26 * dt;
      t.life -= dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
    if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 30);
    if (s.flashTime > 0) {
      s.flashTime -= dt;
      if (s.flashTime <= 0) s.flashStation = -1;
    }
    if (s.status !== STATUS_PLAY) return;

    s.time += dt;
    s.parcelAge = this.parcel ? s.time - this.parcel.born : 0;
    if (s.invuln > 0) s.invuln -= dt;

    // Thrust.
    const mag = Math.hypot(ctrl.tx, ctrl.ty);
    p.thrusting = mag > 0.1;
    if (p.thrusting) {
      p.vx += (ctrl.tx / (mag || 1)) * PLAYER.accel * dt;
      p.vy += (ctrl.ty / (mag || 1)) * PLAYER.accel * dt;
    }
    // Boost: toward the mouse while it is fresh, else along the nose.
    if (ctrl.boost && s.boost >= PLAYER.boostCost) {
      let bx;
      let by;
      if (ctrl.mouseFresh) {
        const dx = ctrl.mx - p.x;
        const dy = ctrl.my - p.y;
        const len = Math.hypot(dx, dy) || 1;
        bx = dx / len;
        by = dy / len;
      } else {
        bx = Math.cos(p.angle);
        by = Math.sin(p.angle);
      }
      p.vx += bx * 300;
      p.vy += by * 300;
      s.boost -= PLAYER.boostCost;
      s.boosts += 1;
      this.burst(p.x - bx * 18, p.y - by * 18, '#9be7ff', 12, 160);
      sfx.boost();
    }
    s.boost = Math.min(PLAYER.boostMax, s.boost + PLAYER.boostRegen * dt);

    // Drag and speed cap, then move.
    const drag = Math.exp(-PLAYER.drag * dt);
    p.vx *= drag;
    p.vy *= drag;
    const speed = Math.hypot(p.vx, p.vy);
    const cap = speed > PLAYER.boostSpeed ? PLAYER.boostSpeed : PLAYER.maxSpeed;
    if (speed > cap) {
      p.vx = (p.vx / speed) * cap;
      p.vy = (p.vy / speed) * cap;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (speed > 24) p.angle = Math.atan2(p.vy, p.vx);
    // Soft wall bounce.
    if (p.x < PLAYER.radius) { p.x = PLAYER.radius; p.vx = Math.abs(p.vx) * 0.5; }
    if (p.x > FIELD.width - PLAYER.radius) { p.x = FIELD.width - PLAYER.radius; p.vx = -Math.abs(p.vx) * 0.5; }
    if (p.y < PLAYER.radius) { p.y = PLAYER.radius; p.vy = Math.abs(p.vy) * 0.5; }
    if (p.y > FIELD.height - PLAYER.radius) { p.y = FIELD.height - PLAYER.radius; p.vy = -Math.abs(p.vy) * 0.5; }

    // Asteroid hits.
    for (const a of this.asteroids) {
      if (Math.hypot(a.x - p.x, a.y - p.y) < a.radius + PLAYER.radius - 4) {
        this.damage(a.x, a.y);
        if (s.status !== STATUS_PLAY) return;
      }
    }
    // Drone hits.
    for (const d of this.drones) {
      const dy = d.baseY + Math.sin(d.phase) * 14;
      if (Math.hypot(d.x - p.x, dy - p.y) < d.radius + PLAYER.radius - 4) {
        this.damage(d.x, dy);
        if (s.status !== STATUS_PLAY) return;
      }
    }

    // Parcel pickup.
    if (this.parcel && s.carrying === -1) {
      if (Math.hypot(this.parcel.x - p.x, this.parcel.y - p.y) < PLAYER.radius + 20) {
        s.carrying = this.parcel.color;
        this.addText(p.x, p.y - 32, `${COLORS[s.carrying].name} PARCEL`, COLORS[s.carrying].main);
        this.burst(this.parcel.x, this.parcel.y, COLORS[s.carrying].main, 16, 180);
        this.parcel = null;
        sfx.pickup();
      }
    }
    // Parcel expires if ignored.
    if (this.parcel && s.parcelAge > PARCEL_LIFETIME) {
      this.addText(this.parcel.x, this.parcel.y - 24, 'PARCEL LOST', '#ff7070');
      this.spawnParcel();
    }

    // Stations.
    for (const st of STATIONS) {
      const d = Math.hypot(st.x - p.x, st.y - p.y);
      if (d < 46 + PLAYER.radius) {
        if (s.carrying === st.color) {
          this.deliver(st);
          return;
        }
        if (s.carrying !== -1) {
          // Wrong dock: bounce off, flash the station, no points.
          const nx = (p.x - st.x) / (d || 1);
          const ny = (p.y - st.y) / (d || 1);
          p.x = st.x + nx * (46 + PLAYER.radius + 2);
          p.y = st.y + ny * (46 + PLAYER.radius + 2);
          p.vx = nx * 180;
          p.vy = ny * 180;
          s.flashStation = st.color;
          s.flashTime = 0.6;
          this.addText(p.x, p.y - 30, 'WRONG DOCK', '#ff7070');
        }
      }
    }
  }
}

export { STEP };
