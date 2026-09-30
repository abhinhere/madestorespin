/**
 * Made Store Spin Wheel - Audio Synthesizer (Web Audio API)
 * 100% offline, zero external audio assets required.
 */

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.lastTickTime = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle(enabled) {
    if (enabled !== undefined) {
      this.enabled = enabled;
    } else {
      this.enabled = !this.enabled;
    }
    return this.enabled;
  }

  /**
   * Mechanical wheel peg click/tick sound
   * Frequency and volume modulate slightly with velocity
   */
  playTick(velocity = 1.0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // Rate-limit very fast ticks to prevent audio clutter
    const now = this.ctx.currentTime;
    if (now - this.lastTickTime < 0.02) return;
    this.lastTickTime = now;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Short wooden peg click
      const freq = 600 + Math.random() * 200 + Math.min(velocity * 80, 400);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.035);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(3.0, now);

      const vol = Math.min(0.25 * velocity + 0.05, 0.35);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {
      // Audio fallback silent fail
    }
  }

  /**
   * Joyful celebration fanfare when landing on a prize
   */
  playWinFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Harmonic arpeggio: C5, E5, G5, C6 with warm sustaining chime
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const noteStart = now + idx * 0.12;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0, noteStart);
        gain.gain.linearRampToValueAtTime(0.22, noteStart + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 1.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 1.25);
      } catch (e) {}
    });
  }

  /**
   * Warm, encouraging chime for "Better Luck Next Time"
   */
  playTryAgain() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [440, 554.37]; // A4, C#5
    notes.forEach((freq, idx) => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const noteStart = now + idx * 0.15;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0, noteStart);
        gain.gain.linearRampToValueAtTime(0.18, noteStart + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.9);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.95);
      } catch (e) {}
    });
  }

  /**
   * Soft button click feedback
   */
  playClick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }
}

export const sounds = new SoundEffects();
