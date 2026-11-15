// Astro Post — tuning constants. Distances are logical pixels (field 1280x720),
// times are seconds, speeds are pixels per second.
export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const PARCELS_TO_WIN = 10;
export const PARCEL_LIFETIME = 25;

export const PLAYER = {
  radius: 15,
  accel: 430,
  maxSpeed: 330,
  boostSpeed: 560,
  drag: 0.55,
  boostCost: 30,
  boostRegen: 16,
  boostMax: 100,
  hearts: 3,
  invulnSeconds: 2,
};

// The three parcel colours. Each station takes one colour.
export const COLORS = [
  { name: 'AMBER', main: '#ffb020', dark: '#8a5a00', glow: 'rgba(255,176,32,0.55)' },
  { name: 'CYAN', main: '#22d3ee', dark: '#075e6b', glow: 'rgba(34,211,238,0.55)' },
  { name: 'MAGENTA', main: '#f472b6', dark: '#7c2d4e', glow: 'rgba(244,114,182,0.55)' },
];

// Stations sit at fixed corners of the field.
export const STATIONS = [
  { color: 0, x: 120, y: 120, label: 'AMBER' },
  { color: 1, x: 1160, y: 120, label: 'CYAN' },
  { color: 2, x: 640, y: 610, label: 'MAGENTA' },
];

export const ASTEROID_BASE = 5;
export const ASTEROID_PER_THREE = 1;
export const DRONE_LANES = [250, 470];
