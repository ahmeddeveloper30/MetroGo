/**
 * Calm modern-tech background bed — deterministic procedural synth.
 * Writes a 62s 48kHz stereo 16-bit WAV (peak-normalized, fades handled at mix time).
 *
 * Usage: node generate_music.cjs [outPath]
 */
const fs = require('fs');
const path = require('path');

const SR = 48000;
const DUR = 62;
const N = Math.round(SR * DUR);
const OUT = process.argv[2] || path.join(__dirname, '..', 'tmp', 'music_calm_tech.wav');

const L = new Float32Array(N);
const R = new Float32Array(N);

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function addSample(i, v, pan) {
  if (i < 0 || i >= N) return;
  const l = Math.cos(((pan + 1) * Math.PI) / 4);
  const r = Math.sin(((pan + 1) * Math.PI) / 4);
  L[i] += v * l;
  R[i] += v * r;
}

/* deterministic PRNG for pluck selection */
let seed = 20261118;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

/* ---------- harmony: Am7 – Fmaj7 – Cmaj7 – G6, 7.75s each ---------- */
const CHORDS = [
  [57, 60, 64, 67], // Am7
  [53, 57, 60, 64], // Fmaj7
  [60, 64, 67, 71], // Cmaj7
  [55, 59, 62, 64], // G6
];
const SEG = 7.75;
const scenes = [];
for (let s = 0; s < Math.ceil(DUR / SEG); s++) {
  scenes.push({ t0: s * SEG, t1: Math.min(DUR, (s + 1) * SEG), chord: CHORDS[s % 4] });
}

/* ---------- pad: 3 detuned sines per chord tone, slow swell ---------- */
const DETUNE = [-5, 0, 5];
const PADS = [-0.3, 0.25, -0.15, 0.3];
for (const { t0, t1, chord } of scenes) {
  chord.forEach((note, idx) => {
    const f = mtof(note);
    const att = 2.2, rel = 2.2;
    const end = Math.min(t1 + 1.2, DUR); // tail bleeds into the next chord
    const i0 = Math.round(t0 * SR), i1 = Math.round(end * SR);
    for (let i = i0; i < i1; i++) {
      const t = i / SR - t0;
      let env = 1;
      if (t < att) env = 0.5 - 0.5 * Math.cos((Math.PI * t) / att);
      const tail = t - (t1 - t0);
      if (tail > 0) env *= Math.max(0, 1 - tail / rel);
      if (env <= 0) continue;
      let v = 0;
      for (const c of DETUNE) v += Math.sin(2 * Math.PI * f * Math.pow(2, c / 1200) * (i / SR));
      addSample(i, (v / DETUNE.length) * env * 0.032, PADS[idx]);
    }
  });
  // sub root one octave down, slow swell
  const subF = mtof(chord[0] - 24);
  {
    const end = Math.min(t1 + 1.5, DUR);
    const i0 = Math.round(t0 * SR), i1 = Math.round(end * SR);
    for (let i = i0; i < i1; i++) {
      const t = i / SR - t0;
      let env = Math.min(1, t / 3);
      const tail = t - (t1 - t0);
      if (tail > 0) env *= Math.max(0, 1 - tail / 2.5);
      addSample(i, Math.sin(2 * Math.PI * subF * (i / SR)) * env * 0.038, 0);
    }
  }
  // airy octave shimmer on the top two chord tones — brightness without bite
  for (const idx of [2, 3]) {
    const f = mtof(chord[idx] + 12);
    const i0 = Math.round(t0 * SR), i1 = Math.round(Math.min(t1 + 1.0, DUR) * SR);
    const phase = idx * 0.9;
    for (let i = i0; i < i1; i++) {
      const t = i / SR - t0;
      let env = Math.min(1, t / 2.5);
      const tail = t - (t1 - t0);
      if (tail > 0) env *= Math.max(0, 1 - tail / 1.8);
      const trem = 0.65 + 0.35 * Math.sin(2 * Math.PI * 0.11 * t + phase);
      addSample(i, Math.sin(2 * Math.PI * f * (i / SR)) * env * trem * 0.012, idx === 2 ? -0.5 : 0.5);
    }
  }
}

/* ---------- soft pulse: muted low thump every 1.9375s ---------- */
for (let t = 1.0; t < DUR - 2; t += 1.9375) {
  const i0 = Math.round(t * SR);
  const len = Math.round(0.4 * SR);
  for (let k = 0; k < len; k++) {
    const tt = k / SR;
    const f = 90 - 30 * Math.min(1, tt / 0.18);
    const env = Math.exp(-tt / 0.11);
    addSample(i0 + k, Math.sin(2 * Math.PI * f * tt) * env * 0.034, 0);
  }
}

/* ---------- bell plucks: sparse, from current chord, octave up ---------- */
const PLUCK_T = [1.3, 3.9, 5.6, 8.2, 10.4, 12.9, 15.3, 17.8, 19.9, 22.4, 24.9, 27.3,
  29.6, 31.9, 34.4, 36.2, 38.9, 41.4, 43.9, 46.2, 48.8, 51.3, 53.9, 56.4];
PLUCK_T.forEach((t, k) => {
  const chord = scenes[Math.min(scenes.length - 1, Math.floor(t / SEG))].chord;
  const note = chord[Math.floor(rnd() * chord.length)] + 12;
  const f = mtof(note);
  const i0 = Math.round(t * SR);
  const len = Math.round(2.6 * SR);
  const pan = k % 2 ? 0.45 : -0.45;
  for (let j = 0; j < len; j++) {
    const tt = j / SR;
    const env = Math.min(1, tt / 0.004) * Math.exp(-tt / 0.85);
    const v = (Math.sin(2 * Math.PI * f * tt) + 0.3 * Math.sin(4 * Math.PI * f * tt) + 0.1 * Math.sin(6 * Math.PI * f * tt)) * env * 0.07;
    addSample(i0 + j, v, pan);
    // cheap room: two taps
    addSample(i0 + j + Math.round(0.11 * SR), v * 0.22, -pan);
    addSample(i0 + j + Math.round(0.23 * SR), v * 0.12, pan * 0.5);
  }
});

/* ---------- air: very quiet soft hiss (kept bright, not rumble) ---------- */
{
  let lpL = 0, lpR = 0;
  let s2 = 987654321;
  const nz = () => ((s2 = (s2 * 1664525 + 1013904223) >>> 0) / 2147483648) - 1;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const lfo = 0.6 + 0.4 * Math.sin(2 * Math.PI * 0.05 * t);
    lpL = lpL * 0.65 + nz() * 0.35;
    lpR = lpR * 0.65 + nz() * 0.35;
    L[i] += lpL * 0.0055 * lfo;
    R[i] += lpR * 0.0055 * lfo;
  }
}

/* ---------- master: soft clip + normalize ---------- */
let peak = 0;
for (let i = 0; i < N; i++) {
  L[i] = Math.tanh(L[i] * 1.15);
  R[i] = Math.tanh(R[i] * 1.15);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const g = 0.72 / (peak || 1);

/* ---------- write 16-bit WAV ---------- */
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + N * 4, 4);
buf.write('WAVE', 8);
buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32);
buf.writeUInt16LE(16, 34);
buf.write('data', 36);
buf.writeUInt32LE(N * 4, 40);
let o = 44;
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(L[i] * g * 32767))), o); o += 2;
  buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(R[i] * g * 32767))), o); o += 2;
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, buf);
console.log(`music → ${OUT} (${DUR}s, peak norm 0.72, ${(buf.length / 1e6).toFixed(1)}MB)`);
