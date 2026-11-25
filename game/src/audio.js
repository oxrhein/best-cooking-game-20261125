// Tiny WebAudio blips, no audio files: every sound is an oscillator started on
// a user gesture, so nothing loads over the network and nothing plays unasked.

export function createAudio() {
  let context = null;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      return null;
    }
    return context;
  }

  /** One short tone. */
  function tone(freq, seconds, type, gainValue, when = 0) {
    const ctx = ensure();
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(gainValue, ctx.currentTime + when);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + seconds);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + when);
      osc.stop(ctx.currentTime + when + seconds);
    } catch {
      // Sound is garnish: a blocked context never breaks the game.
    }
  }

  return {
    /** Call on the first gesture so later tones are allowed to play. */
    unlock() {
      ensure();
    },
    pickup() {
      tone(520, 0.08, 'sine', 0.12);
    },
    chop() {
      tone(180, 0.06, 'square', 0.08);
      tone(140, 0.06, 'square', 0.06, 0.05);
    },
    sizzle() {
      tone(1200, 0.12, 'sawtooth', 0.03);
    },
    ding() {
      tone(880, 0.12, 'sine', 0.14);
      tone(1318, 0.18, 'sine', 0.12, 0.09);
    },
    error() {
      tone(160, 0.16, 'sawtooth', 0.08);
    },
    expired() {
      tone(220, 0.2, 'triangle', 0.1);
      tone(165, 0.3, 'triangle', 0.1, 0.15);
    },
    win() {
      [523, 659, 784, 1046].forEach((freq, index) => tone(freq, 0.22, 'sine', 0.13, index * 0.13));
    },
  };
}
