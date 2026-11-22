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
  if (seen) state.spottedEver = true;
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
      state.alarmHitMax = true;
      for (const g of state.guards) g.alertT = 1;
      if (state.alarmHoldT >= ALARM_HOLD_TO_BUST) {
        state.busted = true;
        state.shakeT = 0.6;
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
  state.maxAlarm = Math.max(state.maxAlarm, state.alarm);

  // Caught red-handed: a guard who touches the thief ends the run at once.
  if (!state.busted) {
    for (const g of state.guards) {
      if (Math.hypot(g.x - state.player.x, g.y - state.player.y) < GUARD_TOUCH) {
        state.busted = true;
        state.shakeT = 0.6;
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

/** End-of-level grade + bonuses, settled once on escape. GHOST: never
 *  spotted and the alarm never moved. CLEAN: spotted but never a full
 *  alarm. LOUD: the alarm hit max. Bonuses reward a thorough, quiet run:
 *  every loot item lifted (+$150) and no alarm at all (+$200). */
export function gradeFor(state) {
  const allLoot = state.loot.length > 0 && state.loot.every((l) => l.taken);
  const noAlarm = state.maxAlarm <= 0;
  const lines = [];
  let bonus = 0;
  if (allLoot) { bonus += 150; lines.push('FULL SWEEP — every loot item lifted: +$150'); }
  if (noAlarm) { bonus += 200; lines.push('SILENT — the alarm never moved: +$200'); }
  let grade;
  if (!state.spottedEver && state.maxAlarm <= 0) grade = 'GHOST';
  else if (state.alarmHitMax) grade = 'LOUD';
  else grade = 'CLEAN';
  return { grade, bonus, lines };
}

export function ratingFor(haul, target, busted) {
  if (busted) return 'BUSTED';
  const ratio = haul / target;
  if (ratio >= 2.2) return 'S — GHOST';
  if (ratio >= 1.6) return 'A — CLEAN';
  if (ratio >= 1.0) return 'B — PRO';
  return 'C — ROOKIE';
}
