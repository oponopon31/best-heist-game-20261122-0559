// Screenshot staging behind ?shot=cover|play|escape (with &seed=N).
// Each scene plays the real rules forward from a fresh level with a simple
// autopilot, so the frame is what a short game really looks like and the
// same seed always gives the same frame. Cover: the thief mid-crossing with
// guard cones, a camera cone, loot and the alarm meter in one frame.
import { STEP } from './config.js';
import { SCREEN_ESCAPED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stepGuards } from './guards.js';
import { stepCameras } from './cameras.js';
import { interact } from './player.js';
import { stepAlarm } from './alarm.js';
import { moveWithWalls } from './world.js';

function silentSounds() {
  const noop = () => {};
  return {
    footstep: noop, pickup: noop, vault: noop, smoke: noop, emp: noop,
    deny: noop, spotted: noop, click: noop, win: noop, lose: noop, heartbeat: noop,
    thud: noop,
  };
}

const sounds = silentSounds();

function autopilot(state) {
  // Head for the nearest untaken loot, then the vault, then the van —
  // steering away from any guard that can see the thief.
  const p = state.player;
  let target = null;
  for (const item of state.loot) if (!item.taken) { target = item; break; }
  if (!target) target = state.vaultOpen ? state.level.exit : state.level.vault;
  let dx = target.x - p.x;
  let dy = target.y - p.y;
  const d = Math.hypot(dx, dy) || 1;
  dx /= d; dy /= d;
  for (const g of state.guards) {
    const gd = Math.hypot(g.x - p.x, g.y - p.y);
    if (gd < 150) { dx += (p.x - g.x) / gd * 0.8; dy += (p.y - g.y) / gd * 0.8; }
  }
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function runSteps(state, seconds, pilot) {
  const n = Math.floor(seconds / STEP);
  for (let i = 0; i < n; i += 1) {
    state.time += STEP;
    const dir = pilot ? autopilot(state) : { x: 0, y: 0 };
    const p = state.player;
    p.moving = pilot;
    if (pilot) {
      p.angle = Math.atan2(dir.y, dir.x);
      moveWithWalls(state, p, dir.x * 165 * STEP, dir.y * 165 * STEP);
    }
    stepGuards(state, STEP);
    stepCameras(state, STEP);
    stepAlarm(state, STEP, sounds);
    for (const s of state.smoke) s.t -= STEP;
    state.smoke = state.smoke.filter((s) => s.t > 0);
    for (const n of state.noises) n.t -= STEP;
    state.noises = state.noises.filter((n) => n.t > 0);
    for (const f of state.floaters) f.t += STEP;
    state.floaters = state.floaters.filter((f) => f.t < 1.4);
    if (state.messageT > 0) state.messageT -= STEP;
    if (state.busted || state.escaped) break;
    // Autopilot grabs whatever it reaches.
    const fakeInput = { direction: () => dir, sneaking: () => false, takeToolSelect: () => -1, takeClick: () => null };
    void fakeInput;
    const nearest = state.loot.find((l) => !l.taken && Math.hypot(l.x - p.x, l.y - p.y) < 36);
    if (nearest) interact(state, sounds);
    if (!state.vaultOpen && Math.hypot(state.level.vault.x - p.x, state.level.vault.y - p.y) < 52) interact(state, sounds);
    if (state.vaultOpen && Math.hypot(state.level.exit.x - p.x, state.level.exit.y - p.y) < 40) interact(state, sounds);
  }
}

/**
 * Set `state` to the named scene and return the screen to draw over it.
 * cover: 6 seconds in, thief mid-crossing, alarm part-raised, loot glowing.
 * play: 20 seconds in, mid-heist with tools spent and smoke out.
 * escape: vault cracked, thief at the van, getaway framed.
 */
export function stageShot(name, state) {
  if (name === 'escape') {
    runSteps(state, 4, true);
    // Force the getaway framing: vault open, thief beside the van, alarm low.
    state.vaultOpen = true;
    state.haul = Math.max(state.haul, 500);
    state.score = state.haul;
    state.alarm = 8;
    state.spotted = false;
    state.player.x = state.level.exit.x - 90;
    state.player.y = state.level.exit.y - 30;
    state.player.angle = 0;
    state.message = 'The van is waiting — go!';
    state.messageT = 99;
    state.escaped = true;
    return { screen: SCREEN_ESCAPED, best: state.score };
  }
  if (name === 'play') {
    // Mid-heist: vault cracked, thief crossing the open floor toward the van.
    runSteps(state, 9, true);
    const sx = Math.min(860, Math.max(100, state.player.x + 60));
    const sy = Math.min(500, Math.max(120, state.player.y - 40));
    state.smoke.push({ x: sx, y: sy, r: 74, t: 2 });
    // A fresh footstep noise ring at the thief's feet, mid-expansion.
    state.noises.push({ x: state.player.x, y: state.player.y, r: 110, t: 0.7 });
    state.message = 'Smoke out — move!';
    state.messageT = 99;
    // Always the live room, never an overlay: the shot must show the heist.
    return { screen: SCREEN_PLAY, best: state.score };
  }
  // cover: the live room, thief mid-crossing, alarm part-raised, loot glowing.
  // Short run on purpose: the vault is still shut, the heist is under way,
  // and the thief is on open floor, clear of the vault door.
  runSteps(state, 3.5, true);
  state.alarm = Math.max(state.alarm, 42);
  state.spotted = true;
  state.message = 'SPOTTED!';
  state.messageT = 99;
  return { screen: SCREEN_PLAY, best: state.score };
}
