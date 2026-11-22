// Room geometry for MIDNIGHT VAULT: level state, wall collision, line of
// sight, loot and the vault. Guards, cameras and the alarm all read from here,
// so the room rules live in exactly one place.
import { LEVELS, PICKUP_RANGE, VIEW } from './config.js';

export function createLevelState(levelIndex) {
  const level = LEVELS[levelIndex];
  return {
    levelIndex,
    level,
    time: 0,
    score: 0,
    haul: 0,
    vaultOpen: false,
    escaped: false,
    busted: false,
    player: {
      x: level.start.x, y: level.start.y, r: 13,
      angle: -Math.PI / 2, moving: false, stepT: 0,
      tools: { smoke: level.tools.smoke, emp: level.tools.emp, lockpick: level.tools.lockpick },
      selectedTool: 0,
    },
    guards: level.guards.map((g) => ({
      waypoints: g.waypoints, speed: g.speed,
      x: g.waypoints[0][0], y: g.waypoints[0][1],
      wp: 1, angle: 0, mode: 'patrol', stunT: 0, chaseT: 0, alertT: 0, pauseT: 0,
      investigateX: 0, investigateY: 0,
      // Graded awareness: a glimpse raises suspicion; a full sighting
      // raises the alarm. suspicion 0-100, lastSeen is where the guard
      // last caught a whiff of the thief.
      suspicion: 0, lastSeenX: g.waypoints[0][0], lastSeenY: g.waypoints[0][1], searchT: 0,
    })),
    cameras: level.cameras.map((c) => ({
      x: c.x, y: c.y, base: c.base, sweep: c.sweep, speed: c.speed,
      angle: c.base, phase: Math.random() * Math.PI * 2, disabledT: 0,
    })),
    loot: level.loot.map((l) => ({ ...l, taken: false })),
    lamps: level.lamps.map((l) => ({ ...l })),
    noises: [],
    smoke: [],
    darts: [],
    floaters: [],
    sparkles: [],
    alarm: 0,
    spotted: false,
    spotGraceT: 0,
    alarmHoldT: 0,
    // Grading: tracked across the level, settled on escape.
    maxAlarm: 0,
    spottedEver: false,
    alarmHitMax: false,
    graded: false,
    grade: null,
    bonus: 0,
    bonusLines: [],
    shakeT: 0,
    sneakedOnce: false,
    message: '',
    messageT: 0,
  };
}

/** True when the circle at (x, y, r) overlaps a wall or leaves the room. */
export function hitsWall(state, x, y, r) {
  if (x < 24 + r || x > VIEW.width - 24 - r || y < 64 + r || y > VIEW.height - 24 - r) return true;
  for (const w of state.level.walls) {
    if (x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) return true;
  }
  return false;
}

/** Slide a circle along walls: try full move, then each axis alone. */
export function moveWithWalls(state, body, dx, dy) {
  if (!hitsWall(state, body.x + dx, body.y + dy, body.r)) { body.x += dx; body.y += dy; return; }
  if (!hitsWall(state, body.x + dx, body.y, body.r)) { body.x += dx; return; }
  if (!hitsWall(state, body.x, body.y + dy, body.r)) { body.y += dy; }
}

function segmentHitsRect(x1, y1, x2, y2, rect) {
  // Slab test: does the segment cross the rectangle?
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const slabs = [
    [-dx, x1 - rect.x], [dx, rect.x + rect.w - x1],
    [-dy, y1 - rect.y], [dy, rect.y + rect.h - y1],
  ];
  for (const [p, q] of slabs) {
    if (p === 0) { if (q < 0) return false; }
    else {
      const t = q / p;
      if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
      else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
  }
  return true;
}

/** True when no wall stands between the two points. */
export function lineOfSight(state, x1, y1, x2, y2) {
  for (const w of state.level.walls) {
    if (segmentHitsRect(x1, y1, x2, y2, w)) return false;
  }
  return true;
}

/** True when the point sits inside any live smoke cloud. */
export function inSmoke(state, x, y) {
  for (const s of state.smoke) {
    if (Math.hypot(x - s.x, y - s.y) < s.r) return true;
  }
  return false;
}

/** True when the point is lit by any lit lamp (walls block light). */
export function isLit(state, x, y) {
  for (const lamp of state.lamps) {
    if (!lamp.lit) continue;
    if (Math.hypot(x - lamp.x, y - lamp.y) < lamp.r && lineOfSight(state, lamp.x, lamp.y, x, y)) return true;
  }
  return false;
}

/** The lit lamp nearest the thief within reach, for snuffing with E. */
export function nearestLamp(state) {
  const p = state.player;
  let best = null;
  let bestD = 40;
  for (const lamp of state.lamps) {
    if (!lamp.lit) continue;
    const d = Math.hypot(lamp.x - p.x, lamp.y - p.y);
    if (d < bestD) { bestD = d; best = lamp; }
  }
  return best;
}

/** A footstep's sound: guards in hearing range come to look. */
export function addNoise(state, x, y, r) {
  state.noises.push({ x, y, r, t: 0.9 });
}

export function nearestLoot(state) {
  const p = state.player;
  let best = null;
  let bestD = PICKUP_RANGE;
  for (const item of state.loot) {
    if (item.taken) continue;
    const d = Math.hypot(item.x - p.x, item.y - p.y);
    if (d < bestD) { bestD = d; best = item; }
  }
  return best;
}

export function nearVault(state) {
  const p = state.player;
  const v = state.level.vault;
  return !state.vaultOpen && Math.hypot(v.x - p.x, v.y - p.y) < 52;
}

export function nearExit(state) {
  const p = state.player;
  const e = state.level.exit;
  return Math.hypot(e.x - p.x, e.y - p.y) < 40;
}

export function addFloater(state, x, y, text, color) {
  state.floaters.push({ x, y, text, color: color || '#ffd76a', t: 0 });
}

export function setMessage(state, text, seconds) {
  state.message = text;
  state.messageT = seconds || 2.5;
}
