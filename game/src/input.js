// MIDNIGHT VAULT — keyboard + mouse input.
export function createInput(canvas) {
  const keys = new Set();
  const input = {
    dx: 0, dy: 0, sneak: false, interact: false,
    click: null, // {x, y} world coords of the last click, consumed by main.js
    enterPressed: false,
    pausePressed: false,
    mutePressed: false,
  };

  function recompute() {
    let dx = 0;
    let dy = 0;
    if (keys.has('arrowleft') || keys.has('a')) dx -= 1;
    if (keys.has('arrowright') || keys.has('d')) dx += 1;
    if (keys.has('arrowup') || keys.has('w')) dy -= 1;
    if (keys.has('arrowdown') || keys.has('s')) dy += 1;
    const len = Math.hypot(dx, dy);
    input.dx = len > 0 ? dx / len : 0;
    input.dy = len > 0 ? dy / len : 0;
    input.sneak = keys.has('shift');
    input.interact = keys.has('e') || keys.has(' ');
  }

  window.addEventListener('keydown', (ev) => {
    const k = ev.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) ev.preventDefault();
    if (k === 'enter') input.enterPressed = true;
    if (k === 'p') input.pausePressed = true;
    if (k === 'm') input.mutePressed = true;
    keys.add(k);
    recompute();
  });
  window.addEventListener('keyup', (ev) => {
    keys.delete(ev.key.toLowerCase());
    recompute();
  });
  window.addEventListener('blur', () => {
    keys.clear();
    recompute();
  });
  canvas.addEventListener('mousedown', (ev) => {
    const rect = canvas.getBoundingClientRect();
    input.click = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
    input.enterPressed = true; // a click also starts / advances screens
  });
  return input;
}
