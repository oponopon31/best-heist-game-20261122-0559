// The thief: movement, sneaking, tools and loot pickup for MIDNIGHT VAULT.
// Moving is quiet on the carpet and loud on the marble; sneaking is slower
// but harder to spot. Tools are thrown at the mouse cursor.
import { EMP_SECONDS, SNEAK_SPEED, TOOL, WALK_SPEED } from './config.js';
import { addFloater, hitsWall, moveWithWalls, nearExit, nearVault, nearestLoot, setMessage } from './world.js';
import { disableNearestCamera } from './cameras.js';

export function stepPlayer(state, input, dt, sounds) {
  const p = state.player;
  const dir = input.direction();
  const sneak = input.sneaking();
  p.sneaking = sneak;
  const speed = sneak ? SNEAK_SPEED : WALK_SPEED;
  p.moving = dir.x !== 0 || dir.y !== 0;
  if (p.moving) {
    p.angle = Math.atan2(dir.y, dir.x);
    moveWithWalls(state, p, dir.x * speed * dt, dir.y * speed * dt);
    p.stepT -= dt;
    if (p.stepT <= 0) {
      p.stepT = sneak ? 0.55 : 0.34;
      sounds.footstep(sneak);
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
