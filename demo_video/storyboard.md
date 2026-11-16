# Smart Metro — 60s Demo Storyboard (v1)

Canvas: 1920×1080 @ 30fps, MP4 H.264. All interactions are REAL (Playwright + Chromium on localhost).
Overlays (Arabic captions + animated arrows) are injected into the live page during recording — guaranteed accurate positioning and RTL.

| # | Time | Scene | Real actions on the site | On-screen Arabic overlay |
|---|---|---|---|---|
| 1 | 00:00–00:05 | Intro card | Rendered brand card (logo, six metro line colors) | «Smart Metro» + «نظام ذكي لتسهيل التنقل عبر مترو القاهرة» |
| 2 | 00:05–00:12 | Homepage | Scroll the real `/app` home (after user login session is prepared), hover quick-trip widget, line-status panel | «واجهة ذكية وسهلة الاستخدام» → «خدمات مترو القاهرة في مكان واحد» |
| 3 | 00:12–00:20 | User login | Fresh `/login` page: type email, masked password (typing hidden→fast cut), press دخول → redirect to `/app` | «تسجيل دخول المستخدم» + arrow on زر الدخول |
| 4 | 00:20–00:35 | Trip planning | On `/app/trip`: open search dropdown (type «سادات»), select; select destination «المنيب»; route appears; **interactive map plays the journey** (moving train, drawing path) | «ابحث عن محطتك» / «حدد نقطة الانطلاق والوجهة» / «اكتشف المسار المناسب» / «خطط رحلتك بسهولة» |
| 5 | 00:35–00:46 | Additional services | Trip summary card (time/stops/ticket price) + journey playback controls (pause/next station) + profile page | «تفاصيل الرحلة والتذكرة» / «تحكم كامل في محاكاة الرحلة» |
| 6 | 00:46–00:54 | Admin | Logout user → `/login` → admin login (masked) → real admin shell + sidebar | «لوحة تحكم المسؤول» / «إدارة ومتابعة النظام» |
| 7 | 00:54–00:58 | Future features | Real stub pages shown as-is with honest overlay | «مميزات قيد التطوير» (AI predictions, analytics…) |
| 8 | 00:58–01:00 | Closing | Brand card | Smart Metro + «رحلة أذكى... تنقل أسهل» |

## Anti-leak rules enforced by the recording script
- Password input recorded only while masked (input `type=password`); typing pauses are cut.
- Email shown is the demo account (`passenger@metro.eg`) — intentional and non-sensitive.
- Auth is never bypassed: real form submissions on the real login page.

## Production pipeline (final, as built)
1. `recording_scripts/record_scenes.cjs` — Playwright + system Chrome (`channel: 'chrome'`), 1920×1080, per-scene WebM in `raw/` + overlay injection (Arabic pills + curved animated arrows) via `context.addInitScript`.
2. `editing_scripts/build_video.cjs` — FFmpeg: trim → retime each clip (`setpts`) → 0.4s xfade chain → silent AAC track (no music, by approval) → H.264 MP4 faststart.
3. `editing_scripts/qc_video.cjs` — automated QC: duration ≤ 60s, h264/1920×1080/30fps, audio present, faststart.
4. Final build (v3): **59.90s**, all QC checks passed. Scene boundaries ≈ intro 0–5.4 · home 5.0–12.4 · login 12.0–20.4 · trip 20.0–35.4 · services 35.0–45.6 · admin 45.6–53.6 · future 53.6–57.6 · closing 57.6–59.9.

## Overlay rules (final)
- Captions are **sequential**: every new callout removes the previous pill/arrow (no accumulation).
- Arrows point at the real element's edge; map targets use short arrows with tips at the map's top edge.
- No music. Audio track is silent AAC.
