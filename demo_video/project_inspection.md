# Smart Metro — Demo Video Project Inspection

**Project:** smart_metro_admin (MetroGo) — Cairo Metro Passenger & Admin Web App
**Inspected:** 2026-11-16
**Purpose:** Prepare a 60-second seminar demo video based on REAL, verified functionality only.

---

## 1. Technology

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 + TypeScript (strict) |
| Styling | Tailwind CSS 3 + custom keyframe animations (`ml-*`, `rp-*`) |
| State | Zustand 5 (auth, theme) |
| Routing | React Router v6 (createBrowserRouter, role-protected routes) |
| HTTP | Axios (`src/api/client.ts`) |
| Backend | **Mock API** (`src/api/mock.ts`, 69 lines) — `USE_MOCK=true` default |
| Auth | Token-based (`smart_metro_admin_token`), role-based redirect (`Passenger → /app`, `Admin → /dashboard`) |

## 2. Environments Compared

| | Online production | Localhost dev (`npm run dev`, port 5173) |
|---|---|---|
| Exists | ❌ No deployed production URL (mock backend; `.env.example` points to `localhost:3000`) | ✅ Running |
| Stability | N/A | ✅ Verified across 5+ days of development (typecheck clean, 0 console errors) |

**Decision: record on Localhost.** There is no online environment; the mock backend provides deterministic data (perfect for a stable recording).

## 3. Routes

- Public: `/login`, `/register`
- Passenger (`/app`): Home, `trip` (planner), `tickets`, `payments`, `alerts`, `profile`
- Admin (`/dashboard` area): `dashboard`, `tickets`, `validations`, `users`, `ai`, `alerts`, `complaints`, `reports`, `network`

## 4. Feature Classification

### ✅ Fully implemented and working (verified in browser)
1. **Login** — real auth flow (register → login → token → role redirect), show/hide password, validation, error states
2. **Register** — full validation, success scene with animated train, auto sign-in
3. **Trip planner (`/app/trip`)** — searchable station selectors (Arabic + English + line badges), swap button, presets from Home, **Dijkstra routing over the real 84-station / 3-line network** (incl. L3 branches), journey timeline with collapsible accordion, trip summary (time / stops / ticket tiers 15–30 EGP)
4. **Interactive metro map** — full-network SVG (all lines, Nile, interchanges) + animated journey playback: play/pause/restart/speed/next-station, moving train, live info panel
5. **Home dashboard** — greeting, service notice, quick trip widget (from/to/swap → plans route), next-trains & line status panels, quick service cards
6. **Profile (`/app/profile`)** — real API-backed profile view (name/email/phone/date)
7. **Passenger shell** — responsive top bar, bottom nav (mobile), notifications bell, theme toggle, **logout on mobile top bar + desktop sidebar**
8. **Visual identity** — six-line signature loader, animated train transitions, dark/light themes

### 🟡 Partially implemented
1. **Home "next trains" & line-status panels** — real UI with clearly-marked mock data (source comment: "MOCK / placeholder content")
2. **Payments / My tickets pages** — pages exist but use mock transaction data

### 🔲 Planned / Not implemented (PageStub placeholders — shown honestly in Scene 7)
- Admin dashboard statistics (DashboardPage), users management, tickets admin, validations log
- AI crowd predictions (AiPage), revenue reports, complaints inbox, service announcements, network data
- AI-powered journey recommendations, smart notifications (per project roadmap)

## 5. Demo Implications (honesty rules)

- **Scene 6 (Admin)** must show: real admin login + the real admin shell (sidebar, role) — the dashboard page is a stub, so it will be shown and honestly labeled "مميزات قيد التطوير" instead of inventing charts.
- **Scene 4 (User features)** focuses on the trip planner + interactive map — the strongest real feature set.
- No credentials will appear in any frame: password fields are masked by the app itself, and recording starts after typing.

## 6. Recording Environment Readiness

| Tool | Status |
|---|---|
| FFmpeg 9.0.2 (libass/fribidi for Arabic) | ✅ installed |
| Playwright 1.65.1 | ✅ CLI available |
| Playwright Chromium | ⏳ downloading during inspection |
| Arabic font | ✅ system font (IBM Plex Sans Arabic already used by the site) |
| Dev server | ✅ `http://localhost:5173` |
| Test accounts | passenger@metro.eg (Passenger) / admin@metro.eg (Admin) — supplied in conversation |
