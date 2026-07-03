function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
}

export function playKillSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Dark low thud — descending sawtooth
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(140, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 1.0);

  gain.gain.setValueAtTime(0.55, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 1.0);

  // Second layer — eerie high whistle
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(900, ctx.currentTime + 0.1);
  osc2.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.9);

  gain2.gain.setValueAtTime(0.0, ctx.currentTime);
  gain2.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.15);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);

  osc2.start(ctx.currentTime);
  osc2.stop(ctx.currentTime + 0.9);
}

export function playSaveSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Bright ascending chime — three notes
  const notes = [523, 659, 784]; // C5, E5, G5
  notes.forEach((freq, i) => {
    const t = ctx.currentTime + i * 0.18;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.start(t);
    osc.stop(t + 0.5);
  });
}
