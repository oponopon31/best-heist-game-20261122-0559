// Guard patrol AI and vision cones for MIDNIGHT VAULT.
// A guard walks its waypoint loop, pauses briefly at each corner, and sweeps
// its gaze along the direction of travel. When the alarm is full it converges
// on the thief; a smoke pellet stuns it in place.
import { GUARD_RANGE } from './config.js';
import { inSmoke, isLit, lineOfSight, moveWithWalls } from './world.js';

const GUARD_FOV = 1.15; // radians, half-angle ~33 degrees
const PAUSE_AT_WAYPOINT = 0.9;

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Can this guard see the thief right now? Sneaking shrinks its range,
 *  and so does darkness: a thief outside every lamp pool is much harder
 *  to spot. */
export function guardSeesPlayer(state, guard) {
  const p = state.player;
  if (guard.stunT > 0) return false;
  if (inSmoke(state, guard.x, guard.y) || inSmoke(state, p.x, p.y)) return false;
  const dx = p.x - guard.x;
  const dy = p.y - guard.y;
  const dist = Math.hypot(dx, dy);
  let range = p.sneaking ? GUARD_RANGE * 0.62 : GUARD_RANGE;
  if (!isLit(state, p.x, p.y)) range *= 0.55;
  if (dist > range) return false;
  if (Math.abs(angleDiff(Math.atan2(dy, dx), guard.angle)) > GUARD_FOV / 2 + 0.12) return false;
  return lineOfSight(state, guard.x, guard.y, p.x, p.y);
}

export function guardCone(state, guard) {
  return { x: guard.x, y: guard.y, angle: guard.angle, range: GUARD_RANGE, fov: GUARD_FOV };
}

/** Graded sighting strength, 0..1: how much of the thief this guard can
 *  make out right now. Full range / dead-centre is a solid sighting;
 *  the cone's edge, a sneaking thief, or darkness is only a glimpse —
 *  enough to grow suspicious, not enough to sound the alarm outright. */
export function partialSighting(state, guard) {
  const p = state.player;
  if (guard.stunT > 0) return 0;
  if (inSmoke(state, guard.x, guard.y) || inSmoke(state, p.x, p.y)) return 0;
  const dx = p.x - guard.x;
  const dy = p.y - guard.y;
  const dist = Math.hypot(dx, dy);
  let range = p.sneaking ? GUARD_RANGE * 0.62 : GUARD_RANGE;
  if (!isLit(state, p.x, p.y)) range *= 0.55;
  const effRange = range * 1.25;
  if (dist > effRange) return 0;
  const edge = GUARD_FOV / 2 + 0.38;
  const off = Math.abs(angleDiff(Math.atan2(dy, dx), guard.angle));
  if (off > edge) return 0;
  if (!lineOfSight(state, guard.x, guard.y, p.x, p.y)) return 0;
  return Math.max(0, (1 - dist / effRange) * (1 - (off / edge) * 0.5));
}

/** Something wrong caught this guard's eye (a snuffed lamp, a bare
 *  pedestal): suspicion jumps and the guard goes to look at the spot. */
export function raiseSuspicion(state, guard, x, y, amount) {
  if (guard.stunT > 0) return;
  guard.suspicion = Math.min(100, guard.suspicion + amount);
  guard.lastSeenX = x;
  guard.lastSeenY = y;
  if (guard.suspicion >= 45 && guard.mode === 'patrol') {
    guard.mode = 'search';
    guard.searchT = 0;
  }
}

/** Advance every guard one step: patrol, pause, investigate a noise,
 *  search a last-seen spot on suspicion, chase, or stand stunned. */
export function stepGuards(state, dt) {
  for (const guard of state.guards) {
    if (guard.stunT > 0) { guard.stunT -= dt; continue; }
    guard.alertT = Math.max(0, guard.alertT - dt);
    // Graded awareness: glimpses feed suspicion; suspicion sends the
    // guard to search the last-seen spot; it decays when nothing is seen.
    const glimpse = partialSighting(state, guard);
    if (glimpse > 0.12) {
      guard.suspicion = Math.min(100, guard.suspicion + glimpse * 75 * dt);
      guard.lastSeenX = state.player.x;
      guard.lastSeenY = state.player.y;
      if (guard.suspicion >= 45 && guard.mode === 'patrol') {
        guard.mode = 'search';
        guard.searchT = 0;
      }
      if (guard.suspicion >= 100) guard.alertT = 1;
    } else {
      guard.suspicion = Math.max(0, guard.suspicion - (guard.mode === 'search' ? 6 : 12) * dt);
    }
    // A noise inside hearing range pulls a patrolling guard over to look.
    if (guard.mode === 'patrol') {
      for (const n of state.noises) {
        if (Math.hypot(n.x - guard.x, n.y - guard.y) < n.r + 60) {
          guard.mode = 'investigate';
          guard.investigateX = n.x;
          guard.investigateY = n.y;
          guard.alertT = 1.5;
          break;
        }
      }
    }
    let tx;
    let ty;
    let speed = guard.speed;
    if (state.alarm >= 100 && guard.mode !== 'chase') { guard.mode = 'chase'; guard.chaseT = 0; }
    if (guard.mode === 'chase') {
      tx = state.player.x; ty = state.player.y; speed = guard.speed * 1.55;
      guard.chaseT += dt;
      if (state.alarm < 40 || guard.chaseT > 6) { guard.mode = 'patrol'; guard.chaseT = 0; }
    } else if (guard.mode === 'investigate') {
      tx = guard.investigateX; ty = guard.investigateY;
      if (Math.hypot(tx - guard.x, ty - guard.y) < 10) {
        // Arrived: look around a moment, then back to the patrol.
        guard.mode = 'patrol';
        guard.pauseT = 1.5;
      }
    } else if (guard.mode === 'search') {
      if (guard.suspicion <= 0) { guard.mode = 'patrol'; guard.searchT = 0; continue; }
      tx = guard.lastSeenX; ty = guard.lastSeenY;
      speed = guard.speed * 0.9;
      if (Math.hypot(tx - guard.x, ty - guard.y) < 12) {
        // Arrived at the last-seen spot: stand and sweep the gaze around.
        guard.searchT += dt;
        guard.angle += 1.7 * dt;
        guard.suspicion = Math.max(0, guard.suspicion - 14 * dt);
        if (guard.searchT > 2.6 || guard.suspicion <= 0) {
          guard.mode = 'patrol';
          guard.searchT = 0;
          guard.suspicion = 0;
          guard.pauseT = 0.6;
        }
        continue;
      }
    } else {
      const target = guard.waypoints[guard.wp];
      tx = target[0]; ty = target[1];
      if (Math.hypot(tx - guard.x, ty - guard.y) < 8) {
        guard.wp = (guard.wp + 1) % guard.waypoints.length;
        guard.pauseT = PAUSE_AT_WAYPOINT;
      }
    }
    if (guard.pauseT > 0) { guard.pauseT -= dt; continue; }
    const dx = tx - guard.x;
    const dy = ty - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= 1) continue;
    const want = Math.atan2(dy, dx);
    let turn = angleDiff(want, guard.angle);
    const maxTurn = 3.4 * dt;
    turn = Math.max(-maxTurn, Math.min(maxTurn, turn));
    guard.angle += turn;
    const step = Math.min(dist, speed * dt);
    const body = { x: guard.x, y: guard.y, r: 12 };
    moveWithWalls(state, body, Math.cos(guard.angle) * step, Math.sin(guard.angle) * step);
    guard.x = body.x;
    guard.y = body.y;
  }
}
