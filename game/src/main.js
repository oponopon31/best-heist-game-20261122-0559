// MIDNIGHT VAULT — boot, the one loop, and the screen state machine.
// Screens: title, play, paused, busted, escaped. The world advances in fixed
// 1/60 s steps; input is read every frame and actions are consumed once.
//
// ?shot=cover|play|escape (with &seed=N) stages that scene instead of running
// the loop, paints it twice and sets window.__shotReady for a screenshot.
// window.__MV exposes the live state for scripted playtests (not a cheat:
// it only reads state and moves the thief, the same as keyboard input).
import { LEVELS, STEP } from './config.js';
import { createLevelState } from './world.js';
import { ACTION_CONFIRM, ACTION_CYCLE_TOOL, ACTION_INTERACT, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, SCREEN_BUSTED, SCREEN_ESCAPED, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stepGuards } from './guards.js';
import { stepCameras } from './cameras.js';
import { interact, stepPlayer } from './player.js';
import { stepAlarm, gradeFor } from './alarm.js';
import { createSounds } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const BEST_KEY = 'midnight-vault-best';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const sounds = createSounds();

let state = createLevelState(0);
let totalHaul = 0;
let screen = SCREEN_TITLE;

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; }
}
function saveBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch { /* private mode: best lasts this visit only */ }
}

function seedCameras() {
  state.cameras.forEach((cam, i) => { cam.phase = ((seed + i * 7919) % 1000) / 1000 * Math.PI * 2; });
}

function runShot(name) {
  seedCameras();
  const scene = stageShot(name, state);
  const renderer = createRenderer(canvas);
  let painted = 0;
  function paint() {
    renderer.draw(state, scene.screen, { best: scene.best });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  const renderer = createRenderer(canvas);
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) { status.textContent = message; }

  function startLevel(index) {
    state = createLevelState(index);
    seedCameras();
    screen = SCREEN_PLAY;
    accumulator = 0;
    announce(`Level ${index + 1}: ${LEVELS[index].name}. Steal the ${LEVELS[index].vault.label}.`);
  }

  function startGame() {
    totalHaul = 0;
    sounds.unlock();
    startLevel(0);
  }

  function stepWorld(dt) {
    state.time += dt;
    stepPlayer(state, input, dt, sounds);
    stepGuards(state, dt);
    stepCameras(state, dt);
    stepAlarm(state, dt, sounds);
    for (const s of state.smoke) s.t -= dt;
    state.smoke = state.smoke.filter((s) => s.t > 0);
    for (const n of state.noises) n.t -= dt;
    state.noises = state.noises.filter((n) => n.t > 0);
    for (const f of state.floaters) f.t += dt;
    state.floaters = state.floaters.filter((f) => f.t < 1.4);
    for (const s of state.sparkles) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.92; s.vy *= 0.92; }
    state.sparkles = state.sparkles.filter((s) => s.t < 0.6);
    if (state.messageT > 0) state.messageT -= dt;
    if (state.shakeT > 0) state.shakeT = Math.max(0, state.shakeT - dt);
    sounds.heartbeat(state.alarm / 100);
    if (state.busted) {
      screen = SCREEN_BUSTED;
      totalHaul += state.haul;
      if (totalHaul > best) { best = totalHaul; saveBest(best); }
      announce(`Busted! Haul $${state.haul}.`);
    } else if (state.escaped) {
      screen = SCREEN_ESCAPED;
      // Settle the grade and bonuses once, before the haul is banked.
      if (!state.graded) {
        const g = gradeFor(state);
        state.grade = g.grade;
        state.bonus = g.bonus;
        state.bonusLines = g.lines;
        state.haul += g.bonus;
        state.graded = true;
      }
      totalHaul += state.haul;
      if (totalHaul > best) { best = totalHaul; saveBest(best); }
      announce(`Clean getaway! Haul $${state.haul}.`);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_RESTART && screen !== SCREEN_TITLE) { startLevel(state.levelIndex); return; }
    if (actions & ACTION_CYCLE_TOOL) {
      state.player.selectedTool = (state.player.selectedTool + 1) % 3;
      announce(`Tool: ${['Smoke pellet', 'EMP dart', 'Lockpick'][state.player.selectedTool]}.`);
    }
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) { sounds.click(); startGame(); }
      return;
    }
    if (screen === SCREEN_BUSTED) {
      if (actions & ACTION_CONFIRM) startLevel(state.levelIndex);
      return;
    }
    if (screen === SCREEN_ESCAPED) {
      if (actions & ACTION_CONFIRM) {
        if (state.levelIndex + 1 < LEVELS.length) startLevel(state.levelIndex + 1);
        else { screen = SCREEN_TITLE; announce('MIDNIGHT VAULT. Press Enter to run it all again.'); }
      }
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) { screen = SCREEN_PLAY; announce('Playing.'); }
      return;
    }
    if (actions & ACTION_PAUSE) { screen = SCREEN_PAUSED; announce('Paused.'); return; }
    if (actions & ACTION_INTERACT) {
      const result = interact(state, sounds);
      if (result === 'loot') announce(`Lifted loot. Haul $${state.haul}.`);
      else if (result === 'vault') announce('Vault cracked — get to the van!');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        stepWorld(STEP);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    // Title screen idles the patrols behind the overlay.
    if (screen === SCREEN_TITLE) {
      state.time += STEP;
      stepGuards(state, STEP);
      stepCameras(state, STEP);
    }
    // The bust shake keeps decaying after the world stops stepping.
    if (screen !== SCREEN_PLAY && state.shakeT > 0) state.shakeT = Math.max(0, state.shakeT - STEP);
    renderer.draw(state, screen, { best });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
  });

  // Playtest hook: read state, move the thief, force the alarm. The game
  // itself never calls these; a scripted test drives them like input.
  window.__MV = {
    get state() { return state; },
    get screen() { return screen; },
    get totalHaul() { return totalHaul; },
    start: startGame,
    startLevel,
    teleport(x, y) { state.player.x = x; state.player.y = y; },
    setAlarm(v) { state.alarm = v; },
    pressInteract() { interact(state, sounds); },
  };

  announce('MIDNIGHT VAULT. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
