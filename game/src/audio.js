// WebAudio synth sounds for MIDNIGHT VAULT — no audio files, every sound is
// built from oscillators and filtered noise at run time.
export function createSounds() {
  let ctx = null;
  let alarmOsc = null;
  let alarmGain = null;

  function ensure() {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
      } catch { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol || 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, filterFreq) {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime;
    const len = Math.floor(c.sampleRate * dur);
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 800;
    const gain = c.createGain();
    gain.gain.setValueAtTime(vol || 0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(c.destination);
    src.start(t);
  }

  return {
    unlock() { ensure(); },
    footstep(sneak) { noise(0.07, sneak ? 0.03 : 0.07, sneak ? 400 : 900); },
    /** A soft thud under each footstep — the sound guards hear. */
    thud(sneak) { noise(0.12, sneak ? 0.02 : 0.06, 300); },
    pickup() { tone(660, 0.12, 'triangle', 0.14); setTimeout(() => tone(990, 0.18, 'triangle', 0.12), 70); },
    vault() { tone(220, 0.3, 'triangle', 0.14, 440); setTimeout(() => tone(880, 0.4, 'sine', 0.12), 160); },
    smoke() { noise(0.5, 0.12, 500); },
    emp() { tone(1200, 0.25, 'square', 0.06, 120); },
    deny() { tone(160, 0.15, 'square', 0.08); },
    spotted() { tone(520, 0.22, 'sawtooth', 0.09, 780); },
    click() { tone(440, 0.06, 'triangle', 0.08); },
    win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'triangle', 0.13), i * 130)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.4, 'sawtooth', 0.09), i * 160)); },
    /** A low pulsing heartbeat while the alarm is high; call every frame. */
    heartbeat(alarm01) {
      const c = ensure();
      if (!c) return;
      if (alarm01 < 0.25) {
        if (alarmOsc) { try { alarmOsc.stop(); } catch {} alarmOsc = null; }
        return;
      }
      if (!alarmOsc) {
        alarmOsc = c.createOscillator();
        alarmGain = c.createGain();
        alarmOsc.type = 'sine';
        alarmOsc.frequency.value = 55;
        alarmGain.gain.value = 0.0;
        alarmOsc.connect(alarmGain).connect(c.destination);
        alarmOsc.start();
      }
      const pulse = 0.5 + 0.5 * Math.sin(c.currentTime * (4 + alarm01 * 10));
      alarmGain.gain.value = 0.05 + alarm01 * 0.06 * pulse;
    },
  };
}
