// All canvas drawing for MIDNIGHT VAULT: the night gallery, vision cones,
// cameras, loot, the thief, the HUD alarm meter, and the title / pause /
// busted / escaped screens. Dark room, warm loot glow, red danger cones.
import { VIEW } from './config.js';
import { alarmLevel, gradeFor } from './alarm.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_ESCAPED = 'escaped';

function conePath(ctx, x, y, angle, range, fov) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - fov / 2, angle + fov / 2);
  ctx.closePath();
}

function drawCone(ctx, cone, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  conePath(ctx, cone.x, cone.y, cone.angle, cone.range, cone.fov);
  ctx.fill();
  ctx.globalAlpha = alpha * 1.6;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawLamps(ctx, state) {
  for (const lamp of state.lamps) {
    if (lamp.lit) {
      // Warm halo so the pool reads even before the darkness pass.
      ctx.save();
      ctx.globalAlpha = 0.20;
      ctx.fillStyle = '#ffcf7a';
      ctx.beginPath(); ctx.arc(lamp.x, lamp.y, lamp.r * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a6a1f';
      ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 3, 0, Math.PI * 2); ctx.fill();
    } else {
      // Snuffed: a cold, dead fixture.
      ctx.fillStyle = '#3a4152';
      ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1f2a';
      ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 3, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawNoiseRings(ctx, state) {
  for (const n of state.noises) {
    const life = Math.max(0, n.t / 0.9);
    ctx.save();
    ctx.globalAlpha = 0.75 * life;
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 2;
    // The ring expands to its full hearing radius, then fades.
    ctx.beginPath(); ctx.arc(n.x, n.y, n.r * (1 - life * 0.55), 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.3 * life;
    ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

/** Night falls over the room: darkness everywhere except the lit lamp
 *  pools and a small pool around the thief, who must always read.
 *  The dark layer is built on an offscreen canvas so the light pools
 *  punch holes in the darkness only — punching them on the main canvas
 *  would erase the room itself and leave black holes. */
let darkLayer = null;
function drawDarkness(ctx, state) {
  if (!darkLayer) {
    darkLayer = document.createElement('canvas');
    darkLayer.width = VIEW.width;
    darkLayer.height = VIEW.height;
  }
  const dctx = darkLayer.getContext('2d');
  dctx.clearRect(0, 0, VIEW.width, VIEW.height);
  dctx.fillStyle = 'rgba(4,6,12,0.55)';
  dctx.fillRect(0, 56, VIEW.width, VIEW.height - 56);
  dctx.globalCompositeOperation = 'destination-out';
  const pool = (x, y, r) => {
    const g = dctx.createRadialGradient(x, y, r * 0.15, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.75, 'rgba(0,0,0,0.9)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    dctx.fillStyle = g;
    dctx.beginPath(); dctx.arc(x, y, r, 0, Math.PI * 2); dctx.fill();
  };
  for (const lamp of state.lamps) if (lamp.lit) pool(lamp.x, lamp.y, lamp.r);
  pool(state.player.x, state.player.y, 72);
  dctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(darkLayer, 0, 0);
}

function drawRoom(ctx, state) {
  const level = state.level;
  // Night floor with a marble sheen.
  ctx.fillStyle = '#141a26';
  ctx.fillRect(0, 56, VIEW.width, VIEW.height - 56);
  ctx.strokeStyle = 'rgba(120,140,180,0.10)';
  ctx.lineWidth = 1;
  for (let x = 24; x < VIEW.width; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, 56); ctx.lineTo(x, VIEW.height - 24); ctx.stroke();
  }
  for (let y = 56; y < VIEW.height; y += 60) {
    ctx.beginPath(); ctx.moveTo(24, y); ctx.lineTo(VIEW.width - 24, y); ctx.stroke();
  }
  // Deep-red carpet runner down the middle.
  ctx.fillStyle = '#3a1620';
  ctx.fillRect(430, 56, 100, VIEW.height - 80);
  ctx.fillStyle = 'rgba(255,210,110,0.16)';
  ctx.fillRect(430, 56, 3, VIEW.height - 80);
  ctx.fillRect(527, 56, 3, VIEW.height - 80);
  // Outer walls.
  ctx.fillStyle = '#232c3f';
  ctx.fillRect(0, 56, VIEW.width, 8);
  ctx.fillRect(0, VIEW.height - 24, VIEW.width, 24);
  ctx.fillRect(0, 56, 24, VIEW.height - 56);
  ctx.fillRect(VIEW.width - 24, 56, 24, VIEW.height - 56);
  // Cover walls / display plinths.
  for (const w of level.walls) {
    ctx.fillStyle = '#2b3550';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = '#3d4a68';
    ctx.fillRect(w.x, w.y, w.w, 5);
    ctx.strokeStyle = '#141a26';
    ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.w, w.h);
  }
  // The vault: a steel door in the north wall, gold when opened.
  const v = level.vault;
  ctx.fillStyle = state.vaultOpen ? '#8a6a1f' : '#4a5468';
  ctx.fillRect(v.x - 46, v.y - 22, 92, 44);
  ctx.fillStyle = state.vaultOpen ? '#ffd76a' : '#6b7688';
  ctx.fillRect(v.x - 34, v.y - 14, 68, 28);
  ctx.fillStyle = '#141a26';
  ctx.beginPath(); ctx.arc(v.x, v.y, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = state.vaultOpen ? '#3a2c05' : '#dfe6f2';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.vaultOpen ? 'OPEN' : 'VAULT', v.x, v.y - 30);
  // Getaway van at the south door.
  const e = level.exit;
  ctx.fillStyle = state.vaultOpen ? '#2f7a4a' : '#3a4a3f';
  ctx.fillRect(e.x - 34, e.y - 16, 68, 32);
  ctx.fillStyle = '#10151d';
  ctx.beginPath(); ctx.arc(e.x - 18, e.y + 16, 8, 0, Math.PI * 2); ctx.arc(e.x + 18, e.y + 16, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8eef7';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('VAN', e.x, e.y - 22);
  if (state.vaultOpen) {
    ctx.strokeStyle = 'rgba(120,255,150,0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(e.x - 40, e.y - 24, 80, 48);
  }
  drawLamps(ctx, state);
}

function drawLoot(ctx, state) {
  for (const item of state.loot) {
    if (item.taken) continue;
    const pulse = 0.5 + 0.5 * Math.sin(state.time * 3 + item.x);
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.25 * pulse;
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(item.x, item.y, 26, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (item.kind === 'painting') {
      ctx.fillStyle = '#c9a227';
      ctx.fillRect(item.x - 22, item.y - 14, 44, 28);
      ctx.fillStyle = '#274b73';
      ctx.fillRect(item.x - 18, item.y - 10, 36, 20);
      ctx.fillStyle = '#e8d9a0';
      ctx.beginPath(); ctx.arc(item.x - 6, item.y - 2, 5, 0, Math.PI * 2); ctx.fill();
    } else if (item.kind === 'gem') {
      ctx.fillStyle = '#9db8c8';
      ctx.fillRect(item.x - 16, item.y - 12, 32, 24);
      ctx.fillStyle = item.label.includes('Emerald') ? '#2fbf71' : item.label.includes('Ruby') ? '#e0485e' : '#5ec8e8';
      ctx.beginPath();
      ctx.moveTo(item.x, item.y - 9); ctx.lineTo(item.x + 8, item.y); ctx.lineTo(item.x, item.y + 9); ctx.lineTo(item.x - 8, item.y);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle = '#c9a227';
      ctx.beginPath(); ctx.arc(item.x, item.y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff2c0';
      ctx.beginPath(); ctx.arc(item.x - 3, item.y - 3, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffe9a8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`$${item.value}`, item.x, item.y + 26);
  }
}

function drawGuards(ctx, state) {
  for (const g of state.guards) {
    const chasing = g.mode === 'chase';
    drawCone(ctx, { x: g.x, y: g.y, angle: g.angle, range: 235, fov: 1.15 },
      chasing ? '#ff2e3e' : '#ff5a3c', g.stunT > 0 ? 0.05 : chasing ? 0.30 : 0.20);
    // Guard: navy uniform, cap, torch dot.
    ctx.fillStyle = g.stunT > 0 ? '#5a6274' : '#1d3a6e';
    ctx.beginPath(); ctx.arc(g.x, g.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d8b25a';
    ctx.fillRect(g.x - 8, g.y - 16, 16, 5);
    ctx.fillStyle = '#fff2c0';
    ctx.beginPath(); ctx.arc(g.x + Math.cos(g.angle) * 15, g.y + Math.sin(g.angle) * 15, 3, 0, Math.PI * 2); ctx.fill();
    // Graded awareness, readable at a glance: a "?" while the guard is
    // suspicious and searching, a "!" on a full sighting, and a small
    // suspicion bar that fills as the guard grows certain.
    if (g.suspicion > 0 && !chasing) {
      ctx.fillStyle = 'rgba(6,8,14,0.85)';
      ctx.fillRect(g.x - 13, g.y - 34, 26, 5);
      ctx.fillStyle = g.suspicion < 45 ? '#ffd76a' : g.suspicion < 80 ? '#ff9a2e' : '#ff2e3e';
      ctx.fillRect(g.x - 12, g.y - 33, 24 * (g.suspicion / 100), 3);
    }
    if (chasing || g.alertT > 0) {
      ctx.fillStyle = '#ff2e3e';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 22);
    } else if (g.suspicion >= 25) {
      ctx.fillStyle = '#ffd76a';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y - 22);
    }
  }
}

function drawCameras(ctx, state) {
  for (const cam of state.cameras) {
    if (cam.disabledT <= 0) {
      drawCone(ctx, { x: cam.x, y: cam.y, angle: cam.angle, range: 230, fov: 0.85 }, '#ff9a2e', 0.18);
    }
    ctx.fillStyle = cam.disabledT > 0 ? '#4a4a4a' : '#20242e';
    ctx.fillRect(cam.x - 10, cam.y - 7, 20, 14);
    ctx.fillStyle = cam.disabledT > 0 ? '#666' : '#ff3b30';
    ctx.beginPath(); ctx.arc(cam.x, cam.y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8ccd4';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cam.disabledT > 0 ? 'OFF' : 'CAM', cam.x, cam.y - 12);
  }
}

function drawPlayer(ctx, state) {
  const p = state.player;
  ctx.save();
  if (p.sneaking) ctx.globalAlpha = 0.8;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 10, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
  // Warm glow so the thief always reads against the dark floor.
  ctx.globalAlpha = (p.sneaking ? 0.8 : 1) * 0.22;
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath(); ctx.arc(p.x, p.y, 26, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = p.sneaking ? 0.8 : 1;
  // Hooded thief: slate cloak, pale mask stripe, facing direction.
  ctx.fillStyle = '#39415a';
  ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#232839';
  ctx.beginPath(); ctx.arc(p.x, p.y, p.r - 4, 0, Math.PI * 2); ctx.fill();
  // Light rim so the silhouette pops at a glance.
  ctx.strokeStyle = '#f2d38a';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#f4f7ff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.angle - 0.5) * 8, p.y + Math.sin(p.angle - 0.5) * 8);
  ctx.lineTo(p.x + Math.cos(p.angle) * 13, p.y + Math.sin(p.angle) * 13);
  ctx.lineTo(p.x + Math.cos(p.angle + 0.5) * 8, p.y + Math.sin(p.angle + 0.5) * 8);
  ctx.stroke();
  ctx.restore();
}

function drawSmoke(ctx, state) {
  for (const s of state.smoke) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#b9c0cc';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.arc(s.x - 20, s.y + 10, s.r * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawFloaters(ctx, state) {
  ctx.textAlign = 'center';
  ctx.font = 'bold 14px sans-serif';
  for (const f of state.floaters) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - f.t / 1.4);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y - f.t * 30);
    ctx.restore();
  }
}

function drawSparkles(ctx, state) {
  for (const s of state.sparkles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - s.t / 0.6);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

/** Live minimap, top-right under the HUD: walls, loot, vault, van,
 *  guards with facing ticks, camera sweeps, and the thief. A stealth
 *  game without a map forces blind play; this is the planning view. */
function drawMinimap(ctx, state) {
  const mw = 150;
  const mh = 94;
  const x0 = VIEW.width - mw - 10;
  const y0 = 64;
  const sx = mw / VIEW.width;
  const sy = mh / VIEW.height;
  const px = (x) => x0 + x * sx;
  const py = (y) => y0 + y * sy;
  ctx.save();
  ctx.fillStyle = 'rgba(6,8,14,0.85)';
  ctx.fillRect(x0, y0, mw, mh);
  ctx.strokeStyle = '#3d4a68';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, mw, mh);
  // Walls.
  ctx.fillStyle = '#4a5878';
  for (const w of state.level.walls) ctx.fillRect(px(w.x), py(w.y), Math.max(2, w.w * sx), Math.max(2, w.h * sy));
  // Lit lamps: faint warm dots.
  for (const lamp of state.lamps) {
    if (!lamp.lit) continue;
    ctx.fillStyle = 'rgba(255,207,122,0.7)';
    ctx.beginPath(); ctx.arc(px(lamp.x), py(lamp.y), 1.8, 0, Math.PI * 2); ctx.fill();
  }
  // Loot left to lift.
  for (const item of state.loot) {
    if (item.taken) continue;
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(px(item.x), py(item.y), 2.5, 0, Math.PI * 2); ctx.fill();
  }
  // Vault: gold diamond (green once open). Van: green square.
  const v = state.level.vault;
  ctx.fillStyle = state.vaultOpen ? '#7dff9a' : '#ffd76a';
  ctx.beginPath();
  ctx.moveTo(px(v.x), py(v.y) - 4); ctx.lineTo(px(v.x) + 4, py(v.y)); ctx.lineTo(px(v.x), py(v.y) + 4); ctx.lineTo(px(v.x) - 4, py(v.y));
  ctx.closePath(); ctx.fill();
  const e = state.level.exit;
  ctx.fillStyle = '#2fbf71';
  ctx.fillRect(px(e.x) - 4, py(e.y) - 3, 8, 6);
  // Cameras: orange dot + sweep tick.
  for (const cam of state.cameras) {
    ctx.fillStyle = cam.disabledT > 0 ? '#666' : '#ff9a2e';
    ctx.beginPath(); ctx.arc(px(cam.x), py(cam.y), 2.5, 0, Math.PI * 2); ctx.fill();
    if (cam.disabledT <= 0) {
      ctx.strokeStyle = 'rgba(255,154,46,0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px(cam.x), py(cam.y));
      ctx.lineTo(px(cam.x) + Math.cos(cam.angle) * 10, py(cam.y) + Math.sin(cam.angle) * 10);
      ctx.stroke();
    }
  }
  // Guards: red dot + facing tick; suspicious ones get a yellow ring.
  for (const g of state.guards) {
    ctx.fillStyle = '#ff5a3c';
    ctx.beginPath(); ctx.arc(px(g.x), py(g.y), 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff5a3c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px(g.x), py(g.y));
    ctx.lineTo(px(g.x) + Math.cos(g.angle) * 7, py(g.y) + Math.sin(g.angle) * 7);
    ctx.stroke();
    if (g.suspicion >= 25) {
      ctx.strokeStyle = '#ffd76a';
      ctx.beginPath(); ctx.arc(px(g.x), py(g.y), 5, 0, Math.PI * 2); ctx.stroke();
    }
  }
  // The thief: white dot, always on top.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(px(state.player.x), py(state.player.y), 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7dff9a';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(px(state.player.x), py(state.player.y), 5, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#9aa5b8';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('MAP', x0 + 4, y0 + 11);
  ctx.restore();
}

/** Level-1 onboarding hints: one short line at a time in the first
 *  seconds, fading out — and skipped once the player has done the thing. */
const LEVEL1_HINTS = [
  { from: 0, to: 5, text: 'Move: WASD / arrow keys' },
  { from: 5, to: 10, text: 'Hold Shift to sneak — quieter, harder to spot', skip: (s) => s.sneakedOnce },
  { from: 10, to: 15, text: 'Press E near a lit lamp to snuff it', skip: (s) => s.lamps.some((l) => !l.lit) },
  { from: 15, to: 21, text: 'Grab loot with E — crack the vault, then reach the van' },
];

function drawHints(ctx, state) {
  if (state.levelIndex !== 0) return;
  const t = state.time;
  const hint = LEVEL1_HINTS.find((h) => t >= h.from && t < h.to && !(h.skip && h.skip(state)));
  if (!hint) return;
  const fade = Math.min(1, (hint.to - t) / 1, (t - hint.from) / 0.5 + 0.2);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, fade));
  ctx.font = '13px sans-serif';
  const w = ctx.measureText(hint.text).width + 28;
  const x = (VIEW.width - w) / 2;
  ctx.fillStyle = 'rgba(6,8,14,0.78)';
  ctx.fillRect(x, 92, w, 26);
  ctx.strokeStyle = 'rgba(255,217,138,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, 92.5, w, 26);
  ctx.fillStyle = '#ffe9a8';
  ctx.textAlign = 'center';
  ctx.fillText(hint.text, VIEW.width / 2, 110);
  ctx.restore();
}

function drawHud(ctx, state, info) {
  ctx.fillStyle = '#0c0f16';
  ctx.fillRect(0, 0, VIEW.width, 56);
  ctx.fillStyle = '#e8eef7';
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('MIDNIGHT VAULT', 16, 24);
  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#9aa5b8';
  ctx.fillText(state.level.name, 16, 42);
  // Haul.
  ctx.fillStyle = '#ffd76a';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`HAUL $${state.haul}`, 330, 24);
  ctx.fillStyle = '#9aa5b8';
  ctx.font = '12px sans-serif';
  ctx.fillText(`target $${state.level.target} · ${state.vaultOpen ? 'vault open — reach the van!' : `steal the ${state.level.vault.label}`}`, 330, 42);
  // Alarm meter.
  const ax = 640;
  const a = alarmLevel(state);
  ctx.fillStyle = '#9aa5b8';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('ALARM', ax, 20);
  ctx.fillStyle = '#2a3140';
  ctx.fillRect(ax, 28, 180, 14);
  ctx.fillStyle = a < 0.5 ? '#e8b93c' : a < 0.85 ? '#ff7a2e' : '#ff2e3e';
  ctx.fillRect(ax, 28, 180 * a, 14);
  ctx.strokeStyle = '#e8eef7';
  ctx.lineWidth = 1;
  ctx.strokeRect(ax + 0.5, 28.5, 180, 14);
  if (state.spotted) {
    ctx.fillStyle = '#ff2e3e';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('SPOTTED!', ax + 190, 40);
  }
  // Tools, in the bottom wall strip: selected tool is highlighted.
  const t = state.player.tools;
  const toolLabels = [
    `[1] Smoke ×${t.smoke}`,
    `[2] EMP ×${t.emp}`,
    `[3] Lockpick ×${t.lockpick}`,
  ];
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  const toolText = toolLabels.join('    ');
  ctx.fillStyle = '#9aa5b8';
  ctx.fillText(toolText, VIEW.width / 2, VIEW.height - 8);
  ctx.textAlign = 'left';
  // Level pips.
  ctx.fillStyle = '#9aa5b8';
  ctx.textAlign = 'right';
  ctx.fillText(`Level ${state.levelIndex + 1}/3   Best $${info.best}`, VIEW.width - 16, 24);
  ctx.textAlign = 'left';
  // Context message.
  if (state.messageT > 0) {
    ctx.fillStyle = state.message === 'SPOTTED!' ? '#ff5a5a' : '#ffe9a8';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.message, VIEW.width / 2, 84);
    ctx.textAlign = 'left';
  }
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(6,8,14,0.82)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = accent || '#e8eef7';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW.width / 2, 210);
  ctx.fillStyle = '#dfe6f2';
  ctx.font = '17px sans-serif';
  let y = 260;
  for (const line of lines) { ctx.fillText(line, VIEW.width / 2, y); y += 30; }
  ctx.textAlign = 'left';
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return {
    draw(state, screen, info) {
      ctx.clearRect(0, 0, VIEW.width, VIEW.height);
      // Screen shake on a bust: a short jolt, decaying with shakeT.
      const shaking = state.shakeT > 0;
      if (shaking) {
        ctx.save();
        ctx.translate((Math.random() - 0.5) * 12 * state.shakeT, (Math.random() - 0.5) * 12 * state.shakeT);
      }
      if (screen === SCREEN_TITLE) {
        drawRoom(ctx, state);
        drawLoot(ctx, state);
        drawGuards(ctx, state);
        drawCameras(ctx, state);
        drawHud(ctx, state, info);
        overlay(ctx, 'MIDNIGHT VAULT', [
          'A top-down stealth heist. Cross the gallery, lift the loot, crack the vault,',
          'and slip out to the getaway van — without the guards or cameras catching you.',
          '',
          'WASD / arrows — move    Shift — sneak    Click — throw tool',
          'E / Space — grab loot · snuff lamp · pick vault · escape    1/2/3 — choose tool    P — pause',
          '',
          'Press Enter or click to start. Steal the Star Sapphire first.',
        ]);
        if (shaking) ctx.restore();
        return;
      }
      drawRoom(ctx, state);
      drawLoot(ctx, state);
      drawGuards(ctx, state);
      drawCameras(ctx, state);
      drawSmoke(ctx, state);
      drawPlayer(ctx, state);
      drawDarkness(ctx, state);
      drawNoiseRings(ctx, state);
      drawFloaters(ctx, state);
      drawSparkles(ctx, state);
      drawMinimap(ctx, state);
      if (screen === SCREEN_PLAY) drawHints(ctx, state);
      drawHud(ctx, state, info);
      if (screen === SCREEN_PAUSED) {
        overlay(ctx, 'PAUSED', ['Press P or Enter to keep sneaking.', 'R restarts the level.']);
      } else if (screen === SCREEN_BUSTED) {
        overlay(ctx, 'BUSTED!', [
          `The guards caught you with $${state.haul} in the bag.`,
          `Level ${state.levelIndex + 1} — ${state.level.name}`,
          '',
          'Press R or Enter to try the gallery again.',
        ], '#ff5a5a');
      } else if (screen === SCREEN_ESCAPED) {
        const next = state.levelIndex + 1 < 3;
        const g = state.graded
          ? { grade: state.grade, bonus: state.bonus, lines: state.bonusLines }
          : gradeFor(state);
        const gradeNote = g.grade === 'GHOST'
          ? 'never seen, never heard — the perfect run'
          : g.grade === 'CLEAN' ? 'spotted, but you slipped away' : 'the whole gallery knew you were here';
        overlay(ctx, next ? 'CLEAN GETAWAY!' : 'THE PERFECT HEIST!', [
          `Haul: $${state.haul} across ${state.levelIndex + 1} ${state.levelIndex + 1 === 1 ? 'gallery' : 'galleries'}.`,
          `Grade: ${g.grade} — ${gradeNote}.`,
          ...g.lines,
          '',
          next ? 'Press Enter for the next gallery — it is better guarded.' : 'All three galleries cleaned out. The night is yours.',
          next ? '' : 'Press R to run it all again.',
        ], '#7dff9a');
      }
      if (shaking) ctx.restore();
    },
  };
}
