// Keyboard and pointer input for Dapur Kilat. Held keys steer the chef;
// one-shot presses (interact, pantry bin 1-5, pause, start) are queued as bit
// flags and taken once by the loop, so a press between frames is never lost.
// Clicking a station walks the chef to it and interacts on arrival.

export const ACTION_INTERACT = 1;
export const ACTION_CONFIRM = 2;
export const ACTION_PAUSE = 4;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const INTERACT = new Set(['KeyE', 'Space']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const BIN_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'];

export function createInput(canvas) {
  let up = false;
  let down = false;
  let left = false;
  let right = false;
  let interactDown = false;
  let actions = 0;
  let bin = -1;
  let click = null;

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (INTERACT.has(event.code)) {
      interactDown = true;
      if (!event.repeat) actions |= ACTION_INTERACT;
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (BIN_KEYS.includes(event.code)) {
      bin = BIN_KEYS.indexOf(event.code);
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (INTERACT.has(event.code)) interactDown = false;
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    up = false;
    down = false;
    left = false;
    right = false;
    interactDown = false;
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    click = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
    actions |= ACTION_CONFIRM;
  });

  return {
    /** Steering vector, each component in -1..1, normalised on diagonals. */
    steer() {
      const x = (right ? 1 : 0) - (left ? 1 : 0);
      const y = (down ? 1 : 0) - (up ? 1 : 0);
      if (x !== 0 && y !== 0) return { x: x * 0.7071, y: y * 0.7071 };
      return { x, y };
    },
    /** True while the interact key is held down (for chopping). */
    interactHeld() {
      return interactDown;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The pantry bin (0-4) last picked with keys 1-5, or -1. */
    takeBin() {
      const taken = bin;
      bin = -1;
      return taken;
    },
    /** The last click in logical 1280x720 coordinates, or null. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
  };
}
