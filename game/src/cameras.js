// Ceiling cameras for MIDNIGHT VAULT: wall mounts that sweep their gaze back
// and forth. A camera that sees the thief feeds the alarm just like a guard.
// An EMP dart shuts one down for a few seconds; smoke blinds it too.
import { CAMERA_RANGE } from './config.js';
import { inSmoke, lineOfSight } from './world.js';

const CAMERA_FOV = 0.85;

/** Sweep the camera head and tick its EMP shutdown timer. */
export function stepCameras(state, dt) {
  for (const cam of state.cameras) {
    if (cam.disabledT > 0) { cam.disabledT -= dt; continue; }
    cam.phase += cam.speed * dt;
    cam.angle = cam.base + Math.sin(cam.phase) * cam.sweep;
  }
}

/** Can this camera see the thief right now? */
export function cameraSeesPlayer(state, cam) {
  const p = state.player;
  if (cam.disabledT > 0) return false;
  if (inSmoke(state, cam.x, cam.y) || inSmoke(state, p.x, p.y)) return false;
  const dx = p.x - cam.x;
  const dy = p.y - cam.y;
  const dist = Math.hypot(dx, dy);
  const range = p.sneaking ? CAMERA_RANGE * 0.7 : CAMERA_RANGE;
  if (dist > range) return false;
  let d = Math.atan2(dy, dx) - cam.angle;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  if (Math.abs(d) > CAMERA_FOV / 2 + 0.1) return false;
  return lineOfSight(state, cam.x, cam.y, p.x, p.y);
}

export function cameraCone(cam) {
  return { x: cam.x, y: cam.y, angle: cam.angle, range: CAMERA_RANGE, fov: CAMERA_FOV };
}

/** Disable the live camera nearest the point (EMP dart impact). */
export function disableNearestCamera(state, x, y) {
  let best = null;
  let bestD = 120;
  for (const cam of state.cameras) {
    if (cam.disabledT > 0) continue;
    const d = Math.hypot(cam.x - x, cam.y - y);
    if (d < bestD) { bestD = d; best = cam; }
  }
  return best;
}
