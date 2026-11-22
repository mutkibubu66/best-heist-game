// MIDNIGHT VAULT — tiny WebAudio bleeps. No audio files: every sound is
// synthesized, so the game loads nothing over the network.
export function createAudio() {
  let ctx = null;
  let muted = false;
  const audio = {
    ensure() {
      if (!ctx) {
        try {
          ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch {
          ctx = null;
        }
      }
      if (ctx && ctx.state === 'suspended') void ctx.resume();
      return ctx;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    blip(freq, dur, type, vol, when = 0) {
      if (muted) return;
      const c = audio.ensure();
      if (!c) return;
      const t0 = c.currentTime + when;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    },
    pickup() { audio.blip(880, 0.12, 'sine', 0.16); audio.blip(1320, 0.1, 'sine', 0.1, 0.06); },
    vault() {
      audio.blip(520, 0.09, 'triangle', 0.16);
      audio.blip(660, 0.09, 'triangle', 0.16, 0.09);
      audio.blip(880, 0.16, 'triangle', 0.16, 0.18);
    },
    cameraOff() { audio.blip(420, 0.15, 'square', 0.08); },
    caught() {
      audio.blip(220, 0.25, 'sawtooth', 0.14);
      audio.blip(160, 0.35, 'sawtooth', 0.14, 0.18);
    },
    alarm() { audio.blip(980, 0.18, 'square', 0.07); audio.blip(740, 0.18, 'square', 0.07, 0.2); },
    clear() {
      [523, 659, 784, 1047].forEach((f, i) => audio.blip(f, 0.18, 'triangle', 0.15, i * 0.11));
    },
    win() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => audio.blip(f, 0.25, 'triangle', 0.15, i * 0.13));
    },
    over() {
      [392, 330, 262, 196].forEach((f, i) => audio.blip(f, 0.3, 'sawtooth', 0.1, i * 0.16));
    },
  };
  return audio;
}
