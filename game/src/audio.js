// Sound for SKYBRIDGE: all WebAudio synthesis, no audio files. A low engine hum
// whose pitch follows throttle, plus short blips for events. Silent until the
// player first interacts (browser autoplay rule), and never required to play.

export class Sound {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.muted = false;
    this.enabled = false;
  }

  unlock() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
      this.enabled = true;
    } catch {
      this.enabled = false;
    }
  }

  engine(throttle, airborne, dt) {
    if (!this.enabled || !this.ctx) return;
    const target = this.muted ? 0 : (airborne ? 0.045 : 0.02) + throttle * 0.05;
    const g = this.engineGain.gain;
    g.value += (target - g.value) * Math.min(1, dt * 4);
    this.engineOsc.frequency.value = 48 + throttle * 62;
  }

  blip(freq, dur = 0.09, vol = 0.12) {
    if (!this.enabled || !this.ctx || this.muted) return;
    try {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start();
      o.stop(this.ctx.currentTime + dur);
    } catch {
      // Sound is decoration; a failure never stops the game.
    }
  }

  chime() {
    this.blip(660, 0.12, 0.14);
    setTimeout(() => this.blip(880, 0.16, 0.14), 110);
  }

  alarm() {
    this.blip(220, 0.18, 0.16);
    setTimeout(() => this.blip(180, 0.18, 0.16), 160);
  }
}
