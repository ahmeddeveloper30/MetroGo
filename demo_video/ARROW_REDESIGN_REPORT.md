# Arrow Redesign — Professional UI-Annotation Overhaul (v5 → v7)

All navigation/annotation arrows in `smart_metro_seminar_demo.mp4` were completely
redesigned (not just recolored). Storyboard, scene boundaries, v3 timings and
narration are unchanged; only the overlay arrows/pills and their aim points changed.

## New arrow system (recorder: `recording_scripts/record_scenes.cjs`)

- **Color/contrast**: white `#FFFFFF` shaft over a dark `#0A1B33` under-stroke
  (10px, 58% opacity) plus a soft `drop-shadow(0 2px 5px rgba(0,0,0,.55))` —
  high contrast on every background (light cards, dark map, red accents).
- **Arrowhead**: fully redesigned — a symmetric wedge (18×8) oriented along the
  curve's end tangent, white fill with a 2.4px dark outline and round joins.
  It is always fully inside the SVG bounds, so it can never be clipped, and the
  shaft ends 3.5px inside the head so the two connect seamlessly.
- **Style**: consistent 4.6px stroke, round line caps, gentle adaptive quadratic
  curve (bow = clamp(distance·0.18, 26→70px)) bowing away from the viewport
  center into free space.
- **Geometry rules**: arrows start on the caption pill's boundary (nearest side,
  +12px) and stop **8px short** of the target's edge — they point at, but never
  touch or cover, text/labels/buttons.
- **Animation**: subtle draw-in (stroke-dashoffset, 0.45s ease-out) with the
  head fading in 0.34s later — no bounce. Identical across all scenes.

## Per-scene positioning fixes (found by frame-by-frame review)

| Scene | Issue found | Fix |
|---|---|---|
| Trip | Pill «حدد نقطة الانطلاق والوجهة» covered the page heading «خطط الرحلة» | Pills moved to x≈560-640, arrows now aim at the field cards' **top edge** (empty band), never crossing the field labels |
| Trip + Services | Map arrow tip measured before the map finished layout → tip ended inside the selects row | New `waitStableBox()` helper: waits until the map's bounding box stops moving before aiming |
| Services | «محاكاة حية لرحلتك» arrow only ~47px long → cramped hook; grazed the controls | Pill moved to (1010,790) → long elegant curve, tip lands above the «المحطة التالية» button |
| Register | Arrow tip pierced the heading text «تم إنشاء حسابك بنجاح» (`down` aims at the box bottom, which is inside the text when approaching from above) | Direction changed to `up` — tip stops above the heading |
| Admin | Pill covered the heading «لوحة التحكم»; pill2 was invisible (its hold time was consumed by a wrong login-time estimate) | Pill1 moved to (950,20), arrow arcs **over** the heading through the logo→link gap to the first sidebar link's top edge; pill2 placed below «بيانات الشبكة» pointing up; elapsed-based tail timing so pill2 now gets real screen time |

## Bugs fixed along the way

- Control-point candidates used `{mx,my}` while the path builder read `.x/.y`
  → arrows rendered as `MNaN,NaN` (invisible) — normalized to `Cp`.
- Layer order: head now renders beneath the shaft (no outline seam at the joint).

## QC

- Final MP4: `demo_video/smart_metro_seminar_demo.mp4` — 59.90s, 1920×1080,
  30fps H.264, silent AAC, faststart — `qc_video.cjs`: **ALL CHECKS PASSED**.
- Every scene reviewed at full resolution; final QC frames:
  `demo_video/screenshots/v7_*.png` (13 frames, all scenes).
- v3 originals preserved: `demo_video/raw_v3_backup/` and
  `tmp/smart_metro_seminar_demo_v3_original.mp4`.

No app UI or functionality was modified — all changes live in the recording
overlay system only.
