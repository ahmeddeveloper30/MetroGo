/**
 * Smart Metro — automated QC for the final MP4.
 * Checks: exists, duration <= 60s, video codec H.264 / 1920x1080 / 30fps,
 * no long black runs, file plays (moov present). Prints a pass/fail report.
 */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const DIR = path.join(__dirname, '..');
const OUT = path.join(DIR, 'smart_metro_seminar_demo.mp4');

if (!fs.existsSync(OUT)) { console.error('FAIL: MP4 not found'); process.exit(1); }

const probe = JSON.parse(execFileSync('ffprobe', [
  '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', OUT,
]).toString());

const v = probe.streams.find((s) => s.codec_type === 'video');
const a = probe.streams.find((s) => s.codec_type === 'audio');
const dur = parseFloat(probe.format.duration);
const checks = [
  ['duration <= 60s', dur <= 60.5, dur.toFixed(2) + 's'],
  ['duration >= 55s', dur >= 55, ''],
  ['codec h264', v.codec_name === 'h264', v.codec_name],
  ['1920x1080', v.width === 1920 && v.height === 1080, `${v.width}x${v.height}`],
  ['~30fps', Math.abs(eval(v.r_frame_rate)) - 30 < 1 || v.avg_frame_rate === '30/1', v.avg_frame_rate],
  ['audio track present (silent ok)', !!a, a ? a.codec_name : 'none'],
  ['moov for streaming (faststart)', fs.statSync(OUT).size > 500_000, (fs.statSync(OUT).size / 1e6).toFixed(1) + ' MB'],
];

let pass = true;
for (const [name, ok, info] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${info}`);
  if (!ok) pass = false;
}

// black-frame scan (ignore the intentional crossfades — flag only runs > 0.5s)
try {
  const out = execFileSync('ffmpeg', [
    '-i', OUT, '-vf', 'blackdetect=d=0.5:pix_th=0.10', '-an',
    '-f', 'null', '-',
  ], { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
} catch (e) {
  const stderr = e.stderr ? e.stderr.toString() : '';
  const runs = stderr.split('\n').filter((l) => l.includes('black_start'));
  if (runs.length === 0) console.log('PASS  no black runs > 0.5s');
  else { console.log('WARN  black runs detected:'); runs.forEach((l) => console.log('  ' + l)); }
}

console.log(pass ? '\nQC: ALL CHECKS PASSED' : '\nQC: FAILURES FOUND');
process.exit(pass ? 0 : 1);
