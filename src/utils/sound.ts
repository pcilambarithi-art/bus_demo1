// Premium Sound FX Synthesizer using Web Audio API

class MobilityAudioSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    const saved = localStorage.getItem('bus_tracker_sound_muted');
    this.isMuted = saved === 'true';
  }

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('bus_tracker_sound_muted', String(this.isMuted));
    if (!this.isMuted) {
      this.playClick();
    }
    return this.isMuted;
  }

  /**
   * Tactile micro-interaction feedback click
   */
  public playClick() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(620, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {
      // Audio not permitted yet
    }
  }

  /**
   * Harmonious confirmation chime on successful actions (e.g. login)
   */
  public playSuccess() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99]; // C5 -> E5 -> G5
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        const start = this.ctx.currentTime + idx * 0.08;
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.3);
      });
    } catch {
      // Audio suppressed
    }
  }

  /**
   * Calming, modern two-tone chime when bus is approaching
   */
  public playApproachingChime() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;

      const tones = [587.33, 880.0]; // D5 -> A5
      tones.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        const start = this.ctx.currentTime + idx * 0.14;
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.45);
      });
    } catch {
      // Audio suppressed
    }
  }

  /**
   * Warm harmonic chime when bus reaches destination stop
   */
  public playArrivalChime() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;

      const chord = [523.25, 659.25, 783.99, 1046.5]; // C major
      chord.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        const start = this.ctx.currentTime + idx * 0.08;
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.09, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.6);
      });
    } catch {
      // Audio suppressed
    }
  }

  /**
   * Trigger light mobile vibration
   */
  public triggerHaptic(pattern: number | number[] = 15) {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Haptics unavailable
    }
  }
}

export const sound = new MobilityAudioSystem();
