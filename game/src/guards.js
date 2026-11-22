// Guard patrol AI and vision cones for MIDNIGHT VAULT.
// A guard walks its waypoint loop, pauses briefly at each corner, and sweeps
// its gaze along the direction of travel. When the alarm is full it converges
// on the thief; a smoke pellet stuns it in place.
import { GUARD_RANGE } from './config.js';
import { inSmoke, lineOfSight, moveWithWalls } from './world.js';

const GUARD_FOV = 1.15; // radians, half-angle ~33 degrees
const PAUSE_AT_WAYPOINT = 0.9;

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Can this guard see the thief right now? Sneaking shrinks its range. */
export function guardSeesPlayer(state, guard) {
  const p = state.player;
  if (guard.stunT > 0) return false;
  if (inSmoke(state, guard.x, guard.y) || inSmoke(state, p.x, p.y)) return false;
  const dx = p.x - guard.x;
  const dy = p.y - guard.y;
  const dist = Math.hypot(dx, dy);
  const range = p.sneaking ? GUARD_RANGE * 0.62 : GUARD_RANGE;
  if (dist > range) return false;
  if (Math.abs(angleDiff(Math.atan2(dy, dx), guard.angle)) > GUARD_FOV / 2 + 0.12) return false;
  return lineOfSight(state, guard.x, guard.y, p.x, p.y);
}

export function guardCone(state, guard) {
  return { x: guard.x, y: guard.y, angle: guard.angle, range: GUARD_RANGE, fov: GUARD_FOV };
}

/** Advance every guard one step: patrol, pause, chase, or stand stunned. */
export function stepGuards(state, dt) {
  for (const guard of state.guards) {
    if (guard.stunT > 0) { guard.stunT -= dt; continue; }
    guard.alertT = Math.max(0, guard.alertT - dt);
    let tx;
    let ty;
    let speed = guard.speed;
    if (state.alarm >= 100 && guard.mode !== 'chase') { guard.mode = 'chase'; guard.chaseT = 0; }
    if (guard.mode === 'chase') {
      tx = state.player.x; ty = state.player.y; speed = guard.speed * 1.55;
      guard.chaseT += dt;
      if (state.alarm < 40 || guard.chaseT > 6) { guard.mode = 'patrol'; guard.chaseT = 0; }
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
