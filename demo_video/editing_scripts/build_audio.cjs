/**
 * Build the 60s audio bed for the demo: calm-tech music + UI sound effects.
 * Beat times were detected from the rendered video (ffmpeg scene detection),
 * so each click/pop lands on the visible action.
 *
 * Usage: node build_audio.cjs  →  demo_video/tmp/audio_mix.wav
 */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const DIR = path.join(__dirname, '..');
const TMP = path.join(DIR, 'tmp');
const SFX = path.join(DIR, 'assets', 'sfx');
const OUT = path.join(TMP, 'audio_mix.wav');
fs.mkdirSync(TMP, { recursive: true });

// 1 — procedural music bed
execFileSync(process.execPath, [path.join(__dirname, 'generate_music.cjs'), path.join(TMP, 'music_calm_tech.wav')], { stdio: 'inherit' });

// 2 — sound effects (video seconds, file, gain in dB)
const EVENTS = [
  // scene transitions
  { t: 14.60, f: 'whoosh-short.mp3', g: -18 },
  { t: 19.90, f: 'whoosh-short.mp3', g: -19 }, // route map reveal
  { t: 38.60, f: 'whoosh-short.mp3', g: -18 },
  { t: 58.00, f: 'whoosh-short.mp3', g: -18 },
  // login: submit
  { t: 11.50, f: 'click-soft.mp3', g: -10 },
  // trip: station picks
  { t: 17.50, f: 'click-soft.mp3', g: -9 },
  { t: 19.80, f: 'click-soft.mp3', g: -10 },
  // trip: zoom clicks (5 rapid taps → 3 audible)
  { t: 24.05, f: 'click-soft.mp3', g: -14 },
  { t: 24.30, f: 'click-soft.mp3', g: -14 },
  { t: 24.55, f: 'click-soft.mp3', g: -14 },
  // pause + map callout
  { t: 25.00, f: 'click-soft.mp3', g: -10 },
  { t: 25.85, f: 'pop.mp3', g: -14 },
  // step to the interchange
  { t: 28.20, f: 'click-soft.mp3', g: -10 },
  { t: 28.45, f: 'click-soft.mp3', g: -10 },
  // transfer callout
  { t: 29.40, f: 'pop.mp3', g: -13 },
  // resume + scroll
  { t: 30.50, f: 'click-soft.mp3', g: -10 },
  // itinerary: expander + two accordions
  { t: 32.75, f: 'click-soft.mp3', g: -11 },
  { t: 32.97, f: 'click-soft.mp3', g: -11 },
  { t: 33.15, f: 'click-soft.mp3', g: -11 },
  // arrival «وصلت!»
  { t: 33.45, f: 'chime.mp3', g: 1 },
  // summary + transfer explainer callouts
  { t: 33.90, f: 'pop.mp3', g: -14 },
  { t: 36.53, f: 'pop.mp3', g: -14 },
  // services: logout, registration success
  { t: 45.00, f: 'click-soft.mp3', g: -10 },
  { t: 46.00, f: 'ping.mp3', g: -8 },
  // closing logo
  { t: 58.60, f: 'sparkle.mp3', g: -16 },
];

const db = (v) => Math.pow(10, v / 20);

// 3 — mix: music bed + delayed sfx
const inputs = ['-i', path.join(TMP, 'music_calm_tech.wav')];
for (const e of EVENTS) inputs.push('-i', path.join(SFX, e.f));

let fc = '';
// music: gentle in/out, sits under everything
fc += `[0:a]afade=t=in:st=0:d=1.4,afade=t=out:st=57.0:d=3.0,volume=${db(-10.0).toFixed(4)}[m]`;
EVENTS.forEach((e, i) => {
  const ms = Math.round(e.t * 1000);
  fc += `;[${i + 1}:a]adelay=${ms}|${ms},volume=${db(e.g).toFixed(4)}[s${i}]`;
});
const mixIn = '[m]' + EVENTS.map((_, i) => `[s${i}]`).join('');
fc += `;${mixIn}amix=inputs=${EVENTS.length + 1}:normalize=0:duration=first,alimiter=limit=0.89,pan=stereo|c0=c0|c1=c1[aout]`;

execFileSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-y',
  ...inputs,
  '-filter_complex', fc,
  '-map', '[aout]',
  '-t', '60',
  '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le',
  OUT,
], { stdio: 'inherit' });

console.log(`audio mix → ${OUT} (${EVENTS.length} sfx + music bed)`);
