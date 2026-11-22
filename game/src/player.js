// The thief: movement, sneaking, tools and loot pickup for MIDNIGHT VAULT.
// Moving is quiet on the carpet and loud on the marble; sneaking is slower
// but harder to spot. Tools are thrown at the mouse cursor.
import { EMP_SECONDS, SNEAK_SPEED, TOOL, WALK_SPEED } from './config.js';
import { addFloater, addNoise, hitsWall, moveWithWalls, nearExit, nearVault, nearestLamp, nearestLoot, setMessage } from './world.js';
import { disableNearestCamera } from './cameras.js';
import { raiseSuspicion } from './guards.js';

/** A guard who wanders close to a fresh crime scene gets suspicious:
 *  a bare pedestal or a dead lamp is evidence someone is here. */
function disturbNearbyGuards(state, x, y, radius, amount) {
  for (const g of state.guards) {
    if (Math.hypot(g.x - x, g.y - y) < radius) raiseSuspicion(state, g, x, y, amount);
  }
}

/** A burst of gold sparks where loot was just lifted. */
function burstSparkles(state, x, y) {
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2 + Math.random() * 0.6;
    const v = 40 + Math.random() * 70;
    state.sparkles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0 });
  }
}

export function stepPlayer(state, input, dt, sounds) {
  const p = state.player;
  const dir = input.direction();
  const sneak = input.sneaking();
  p.sneaking = sneak;
  if (sneak) state.sneakedOnce = true;
  const speed = sneak ? SNEAK_SPEED : WALK_SPEED;
  p.moving = dir.x !== 0 || dir.y !== 0;
  if (p.moving) {
    p.angle = Math.atan2(dir.y, dir.x);
    moveWithWalls(state, p, dir.x * speed * dt, dir.y * speed * dt);
    p.stepT -= dt;
    if (p.stepT <= 0) {
      p.stepT = sneak ? 0.55 : 0.34;
      sounds.footstep(sneak);
      // Every footstep is a noise guards can hear: loud on the walk,
      // a whisper on the sneak.
      addNoise(state, p.x, p.y, sneak ? 45 : 110);
      if (sounds.thud) sounds.thud(sneak);
    }
  }
  const sel = input.takeToolSelect();
  if (sel >= 0) p.selectedTool = sel;
  const click = input.takeClick();
  if (click) throwTool(state, click, sounds);
}

function throwTool(state, at, sounds) {
  const p = state.player;
  if (p.selectedTool === TOOL.SMOKE) {
    if (p.tools.smoke <= 0) { setMessage(state, 'No smoke pellets left!', 1.2); sounds.deny(); return; }
    p.tools.smoke -= 1;
    state.smoke.push({ x: at.x, y: at.y, r: 74, t: 3.5 });
    for (const g of state.guards) {
      if (Math.hypot(g.x - at.x, g.y - at.y) < 90) g.stunT = 2.2;
    }
    sounds.smoke();
    setMessage(state, 'Smoke out — move!', 1.4);
  } else if (p.selectedTool === TOOL.EMP) {
    if (p.tools.emp <= 0) { setMessage(state, 'No EMP darts left!', 1.2); sounds.deny(); return; }
    const cam = disableNearestCamera(state, at.x, at.y);
    if (!cam) { setMessage(state, 'No camera in range of that dart.', 1.4); sounds.deny(); return; }
    p.tools.emp -= 1;
    cam.disabledT = EMP_SECONDS;
    state.darts.push({ x: cam.x, y: cam.y, t: 0.3 });
    sounds.emp();
    setMessage(state, 'Camera down — 6 seconds.', 1.6);
  } else {
    setMessage(state, 'Lockpick is used at the vault — press E there.', 1.8);
    sounds.deny();
  }
}

/** E / Space: grab loot, pick the vault, or slip out the exit. Returns a tag. */
export function interact(state, sounds) {
  const p = state.player;
  const item = nearestLoot(state);
  if (item) {
    item.taken = true;
    state.score += item.value;
    state.haul += item.value;
    addFloater(state, item.x, item.y - 18, `+$${item.value}`, '#ffd76a');
    burstSparkles(state, item.x, item.y);
    disturbNearbyGuards(state, item.x, item.y, 200, 30);
    sounds.pickup();
    return 'loot';
  }
  if (nearVault(state)) {
    if (p.tools.lockpick <= 0) { setMessage(state, 'The vault needs a lockpick — none left!', 2); sounds.deny(); return 'locked'; }
    p.tools.lockpick -= 1;
    state.vaultOpen = true;
    state.score += state.level.vault.value;
    state.haul += state.level.vault.value;
    addFloater(state, state.level.vault.x, state.level.vault.y - 24, `+$${state.level.vault.value}`, '#ffe9a8');
    sounds.vault();
    setMessage(state, `${state.level.vault.label} is yours — get to the van!`, 3);
    return 'vault';
  }
  const lamp = nearestLamp(state);
  if (lamp) {
    lamp.lit = false;
    addFloater(state, lamp.x, lamp.y - 18, 'Lamp out', '#ffb46a');
    disturbNearbyGuards(state, lamp.x, lamp.y, 220, 35);
    sounds.click();
    setMessage(state, 'Lamp out — the dark is yours.', 1.6);
    return 'lamp';
  }
  if (nearExit(state)) {
    if (!state.vaultOpen) { setMessage(state, `Grab the ${state.level.vault.label} first!`, 2); sounds.deny(); return 'need-vault'; }
    state.escaped = true;
    sounds.win();
    return 'escape';
  }
  return null;
}

export function playerInWall(state) {
  return hitsWall(state, state.player.x, state.player.y, state.player.r);
}
