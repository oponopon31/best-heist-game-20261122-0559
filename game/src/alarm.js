// The alarm meter for MIDNIGHT VAULT: spotting, grace, the full-alarm
// convergence, and the busted / escaped endings. The caught moment is fair:
// a visible SPOTTED! warning and a grace window come before any bust, and
// the meter decays the moment the thief breaks line of sight.
import { ALARM_FALL, ALARM_HOLD_TO_BUST, ALARM_MAX, ALARM_RISE, GUARD_TOUCH, SPOT_GRACE } from './config.js';
import { setMessage } from './world.js';
import { guardSeesPlayer } from './guards.js';
import { cameraSeesPlayer } from './cameras.js';

export function stepAlarm(state, dt, sounds) {
  let seen = false;
  for (const g of state.guards) if (guardSeesPlayer(state, g)) { seen = true; break; }
  if (!seen) for (const c of state.cameras) if (cameraSeesPlayer(state, c)) { seen = true; break; }

  const wasSpotted = state.spotted;
  state.spotted = seen;
  if (seen) {
    if (!wasSpotted) {
      state.spotGraceT = SPOT_GRACE;
      setMessage(state, 'SPOTTED!', 1.2);
      sounds.spotted();
    }
    state.spotGraceT = Math.max(0, state.spotGraceT - dt);
    if (state.spotGraceT <= 0) {
      state.alarm = Math.min(ALARM_MAX, state.alarm + ALARM_RISE * dt);
    }
    if (state.alarm >= ALARM_MAX) {
      state.alarmHoldT += dt;
      for (const g of state.guards) g.alertT = 1;
      if (state.alarmHoldT >= ALARM_HOLD_TO_BUST) {
        state.busted = true;
        sounds.lose();
      }
    } else {
      state.alarmHoldT = 0;
    }
  } else {
    state.spotGraceT = 0;
    state.alarmHoldT = 0;
    state.alarm = Math.max(0, state.alarm - ALARM_FALL * dt);
  }

  // Caught red-handed: a guard who touches the thief ends the run at once.
  if (!state.busted) {
    for (const g of state.guards) {
      if (Math.hypot(g.x - state.player.x, g.y - state.player.y) < GUARD_TOUCH) {
        state.busted = true;
        sounds.lose();
        break;
      }
    }
  }
  return seen;
}

export function alarmLevel(state) {
  return state.alarm / ALARM_MAX;
}

export function ratingFor(haul, target, busted) {
  if (busted) return 'BUSTED';
  const ratio = haul / target;
  if (ratio >= 2.2) return 'S — GHOST';
  if (ratio >= 1.6) return 'A — CLEAN';
  if (ratio >= 1.0) return 'B — PRO';
  return 'C — ROOKIE';
}
