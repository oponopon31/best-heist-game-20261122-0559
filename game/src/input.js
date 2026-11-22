// Keyboard + mouse input for MIDNIGHT VAULT.
// WASD/arrows move, Shift sneaks, E/Space grabs, 1/2/3 pick a tool, Q cycles
// tools, click throws the selected tool at the cursor, P/Esc pauses, R restarts,
// Enter confirms. Actions are edge-triggered and consumed once per frame.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_INTERACT = 4;
export const ACTION_RESTART = 8;
export const ACTION_CYCLE_TOOL = 16;

const MOVE_KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let mouse = { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };
  let toolSelect = -1;

  function press(code) {
    if (code === 'Enter' || code === 'Space') actions |= ACTION_CONFIRM;
    if (code === 'KeyP' || code === 'Escape') actions |= ACTION_PAUSE;
    if (code === 'KeyE') actions |= ACTION_INTERACT;
    if (code === 'KeyR') actions |= ACTION_RESTART;
    if (code === 'KeyQ') actions |= ACTION_CYCLE_TOOL;
    if (code === 'Digit1') toolSelect = 0;
    if (code === 'Digit2') toolSelect = 1;
    if (code === 'Digit3') toolSelect = 2;
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (!event.repeat) press(event.code);
    held.add(event.code);
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  });
  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.clickX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    mouse.clickY = ((event.clientY - rect.top) / rect.height) * canvas.height;
    mouse.clicked = true;
    actions |= ACTION_CONFIRM;
  });

  return {
    direction() {
      let x = 0;
      let y = 0;
      for (const code of held) {
        const d = MOVE_KEYS[code];
        if (d) { x += d[0]; y += d[1]; }
      }
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    sneaking() { return held.has('ShiftLeft') || held.has('ShiftRight'); },
    takeActions() { const a = actions; actions = 0; return a; },
    takeToolSelect() { const t = toolSelect; toolSelect = -1; return t; },
    takeClick() {
      if (!mouse.clicked) return null;
      mouse.clicked = false;
      return { x: mouse.clickX, y: mouse.clickY };
    },
    cursor() { return { x: mouse.x, y: mouse.y }; },
  };
}
