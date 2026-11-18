/**
 * Smart Metro — assemble the final 60s MP4 from raw scene WebMs.
 *
 * 1. Trim each scene to its exact on-screen duration (cutting load/setup time).
 * 2. Normalize to 30fps 1920x1080 yuv420p.
 * 3. Chain scenes with 0.4s crossfades (total lands on exactly 60s).
 * 4. Add a silent audio track (player compatibility) + H.264 MP4.
 */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const DIR = path.join(__dirname, '..');
const RAW = path.join(DIR, 'raw');
const TMP = path.join(DIR, 'tmp');
const OUT = path.join(DIR, 'smart_metro_seminar_demo.mp4');

const FADE = 0.4;
/** exact on-screen durations — must match record_scenes.js */
const DUR = { intro: 5.4, home: 7.4, login: 8.4, trip: 15.4, services: 11.0, admin: 8.4, future: 4.4, closing: 2.4 };
const SCENES = Object.keys(DUR);
const HAS_FADE = { intro: false, home: true, login: true, trip: true, services: true, admin: true, future: true, closing: true };
/** per-scene push-in amount (fraction of frame) — keep tiny on UI scenes so text stays crisp */
const ZOOM = { intro: 0.05, home: 0.03, login: 0.03, trip: 0.03, services: 0.03, admin: 0.03, future: 0.04, closing: 0.05 };
const AUDIO = path.join(DIR, 'tmp', 'audio_mix.wav');

fs.mkdirSync(TMP, { recursive: true });

function ff(args, label) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (label) console.log('✓ ' + label);
}

// load time per scene (recorded during recording phase)
const timings = JSON.parse(fs.readFileSync(path.join(RAW, 'timings.json'), 'utf8'));

// 1+2 — trim each scene, then retime it to EXACTLY its planned duration.
// (Playwright's WebM compresses idle wall-clock time; setpts restores the plan.)
function probeDur(file) {
  const out = execFileSync('ffprobe', ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim();
  return parseFloat(out);
}

const parts = [];
for (const name of SCENES) {
  const t = timings[name] || { loadMs: 800, dur: DUR[name] };
  const start = Math.max(0, (t.loadMs || 800) / 1000 + 0.15);
  const dur = t.dur || DUR[name];
  const out = path.join(TMP, `${name}.mp4`);
  ff([
    '-i', path.join(RAW, `${name}.webm`),
    '-ss', String(start), '-t', String(dur),
    '-r', '30', '-vf', 'scale=1920:1080:flags=lanczos,setsar=1',
    '-pix_fmt', 'yuv420p', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
    out,
  ], `trim ${name}`);
  let actual = probeDur(out);
  console.log(`  ${name}: planned ${dur}s, actual ${actual.toFixed(2)}s`);
  if (Math.abs(actual - dur) > 0.05) {
    const factor = dur / actual; // >1 slows down, <1 speeds up
    const fixed = path.join(TMP, `${name}_fixed.mp4`);
    ff([
      '-i', out,
      '-vf', `setpts=PTS*${factor.toFixed(4)},fps=30`,
      '-pix_fmt', 'yuv420p', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
      fixed,
    ], `retime ${name} → ${dur}s (×${factor.toFixed(3)})`);
    fs.rmSync(out); fs.renameSync(fixed, out);
    actual = probeDur(out);
  }

  // 2b — subtle camera push-in so each frame feels alive (resets at each cut).
  // UI scenes anchor bottom-right so the sidebar text and bottom controls never
  // get clipped; full-bleed logo cards zoom from the center.
  const zAmp = ZOOM[name] ?? 0.03;
  const frames = Math.max(2, Math.round(dur * 30));
  const center = name === 'intro' || name === 'closing';
  const pos = center
    ? `x='iw/2-(iw/zoom)/2':y='ih/2-(ih/zoom)/2'`
    : `x='iw-iw/zoom':y='0'`;
  const moved = path.join(TMP, `${name}_mv.mp4`);
  ff([
    '-i', out,
    '-vf', `scale=3840:2160:flags=lanczos,zoompan=z='min(1+${zAmp}*on/${frames},${(1 + zAmp).toFixed(4)})':${pos}:d=1:s=1920x1080:fps=30,setsar=1`,
    '-pix_fmt', 'yuv420p', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
    moved,
  ], `motion ${name} (+${(zAmp * 100).toFixed(1)}%, ${center ? 'center' : 'top-right'})`);
  fs.rmSync(out); fs.renameSync(moved, out);
  parts.push({ name, dur: probeDur(out), file: out });
}

// 3 — xfade chain (each fade consumes 0.4s of the joined timeline)
// offset_i = sum(dur_0..i-1) - i*FADE   (i is the index of the clip fading IN)
const inputs = [];
let filter = '';
let acc = 0;
for (let i = 0; i < parts.length; i++) {
  inputs.push('-i', parts[i].file);
  if (i > 0) {
    const off = acc - i * FADE;
    const prev = i === 1 ? '[0:v]' : `[x${i - 1}]`;
    filter += `${prev}[${i}:v]xfade=transition=fade:duration=${FADE}:offset=${off.toFixed(3)}[x${i}];`;
  }
  acc += parts[i].dur;
}
filter += `[x${parts.length - 1}]format=yuv420p[vout]`;

const totalDur = acc - FADE * (parts.length - 1);
console.log(`total after crossfades: ${totalDur.toFixed(2)}s (target 60.0s)`);

ff([
  ...inputs,
  ...(fs.existsSync(AUDIO) ? ['-i', AUDIO] : ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo']),
  '-filter_complex', filter,
  '-map', '[vout]',
  '-map', `${parts.length}:a`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '29', '-r', '30',
  '-c:a', 'aac', '-b:a', '80k', '-ar', '48000', '-shortest',
  '-movflags', '+faststart',
  OUT,
], `final MP4 → ${OUT}`);
