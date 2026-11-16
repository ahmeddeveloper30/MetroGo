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
  '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
  '-filter_complex', filter,
  '-map', '[vout]',
  '-map', `${parts.length}:a`,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-r', '30',
  '-c:a', 'aac', '-b:a', '96k', '-shortest',
  '-movflags', '+faststart',
  OUT,
], `final MP4 → ${OUT}`);
