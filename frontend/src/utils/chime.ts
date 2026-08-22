type ChimeKind = 'complete' | 'break-over' | 'reminder';

/** Tiny WebAudio chime — no audio assets needed. */
export function playFocusChime(kind: ChimeKind = 'complete') {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes: number[] =
      kind === 'complete'
        ? [523.25, 659.25, 783.99]
        : kind === 'break-over'
          ? [659.25, 830.61]
          : [880];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.16, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.6);
    });

    window.setTimeout(() => ctx.close().catch(() => {}), 1800);
  } catch {
    /* audio unavailable */
  }
}
