// Keyboard + mouse input for SKYBRIDGE. Keys are polled per frame; clicks are
// delivered as events the menu and HUD buttons consume.

export const KEYS = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  throttleUp: ['ArrowRight', 'KeyD'],
  throttleDown: ['ArrowLeft', 'KeyA'],
  flaps: ['KeyF'],
  gear: ['KeyG'],
  pause: ['KeyP', 'Escape'],
  restart: ['KeyR'],
  start: ['Enter', 'Space'],
  autopilot: ['KeyL'],
};

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set(); // edge-triggered, consumed once per frame
    this.clicks = []; // {x, y} in canvas CSS pixels
    this.onKey = (e) => {
      if (e.repeat) return;
      this.down.add(e.code);
      this.pressed.add(e.code);
      if (KEYS.up.includes(e.code) || KEYS.down.includes(e.code) || e.code === 'Space') {
        e.preventDefault();
      }
    };
    this.onUp = (e) => this.down.delete(e.code);
    this.onClick = (e) => {
      const rect = e.target.getBoundingClientRect();
      this.clicks.push({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    this.onBlur = () => {
      this.down.clear();
      this.pressed.clear();
    };
  }

  attach(canvas) {
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onUp);
    window.addEventListener('blur', this.onBlur);
    canvas.addEventListener('pointerdown', this.onClick);
  }

  held(group) {
    return KEYS[group].some((k) => this.down.has(k));
  }

  tapped(group) {
    return KEYS[group].some((k) => this.pressed.has(k));
  }

  endFrame() {
    this.pressed.clear();
    this.clicks.length = 0;
  }
}
