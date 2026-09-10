/**
 * Zero-dependency Web Audio API Chime & Alarm Generator
 */
class SoundEngine {
  private audioCtx: AudioContext | null = null;
  private isPlayingLoop = false;
  private loopTimerId: number | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Plays a pleasant dual-tone harmonic chime
   */
  public playChime(): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      // Note 1: E5 (659.25 Hz)
      this.playTone(ctx, 659.25, now, 0.4, 0.25);
      // Note 2: G#5 (830.61 Hz)
      this.playTone(ctx, 830.61, now + 0.12, 0.5, 0.25);
      // Note 3: B5 (987.77 Hz)
      this.playTone(ctx, 987.77, now + 0.24, 0.6, 0.3);
      // Note 4: E6 (1318.51 Hz)
      this.playTone(ctx, 1318.51, now + 0.36, 0.9, 0.35);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  private playTone(ctx: AudioContext, freq: number, startTime: number, duration: number, gainValue: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    // Envelope
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  /**
   * Starts repeating chime loop until dismissed
   */
  public startAlarmLoop(): void {
    if (this.isPlayingLoop) return;
    this.isPlayingLoop = true;

    this.playChime();
    this.loopTimerId = window.setInterval(() => {
      if (this.isPlayingLoop) {
        this.playChime();
      }
    }, 2000);
  }

  /**
   * Stops any ongoing alarm sound
   */
  public stopAlarmLoop(): void {
    this.isPlayingLoop = false;
    if (this.loopTimerId !== null) {
      clearInterval(this.loopTimerId);
      this.loopTimerId = null;
    }
  }

  public get isRinging(): boolean {
    return this.isPlayingLoop;
  }
}

export const soundEngine = new SoundEngine();
