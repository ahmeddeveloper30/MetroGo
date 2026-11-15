# 🚇 MetroGo — Cairo Metro Admin & Passenger App

A modern web application for the **Cairo Greater Metro**, built with a full visual identity redesign — including a signature six-line loader, animated login/register transitions, and a **Google-Maps-style interactive route planner** with journey playback.

> 🇪🇬 The entire UI is in **Arabic (RTL)** with English fallbacks for station names.

---

## ✨ Features

### 👤 Passenger App (`/app`)
- **Trip Planner** — searchable station selectors (Arabic + English + line badges), swap button, presets from the home page
- **Smart routing** — Dijkstra shortest-path over the full Cairo Metro network (Lines 1, 2, 3 incl. branch lines), with 2 min/hop + 5 min/transfer estimation
- **Interactive Metro Map** — hand-drawn SVG schematic of all lines (official colors), the Nile, interchanges and stations
- **Journey playback** ▶ — watch your trip station-by-station: animated route drawing, a moving train, visited / current / upcoming station states, and interchange transfer (walk) animations
- **Playback controls** — Play / Pause / Resume / Restart / Next Station / Speed (×0.5 · ×1 · ×2 · ×4)
- **Live journey info panel** — start, destination, current station, next station, remaining stations, current line, transfers, estimated duration
- **Trip summary** — total time, stops count, lines used, and ticket price tiers (15 / 20 / 25 / 30 EGP by 1–9 / 10–16 / 17–23 / 24+ stops)
- **Step-by-step timeline** — collapsible detailed route breakdown with a "ركب N محطة" accordion
- Pan / zoom map, hover station tooltips, fully responsive (desktop & mobile), reduced-motion aware

### 🛠 Admin Dashboard (`/dashboard`)
- Overview stats, users management, tickets, payments
- Network & stations management, service alerts, complaints
- Reports, validations, and AI assistant pages

---

## 🗺 Metro Network Data

- **84 stations** across **3 operating lines** (+ 2 upcoming lines 4 & 6):
  - **Line 1 (Blue)** — المرج ↔ حلوان
  - **Line 2 (Red)** — شبرا الخيمة ↔ المنيب
  - **Line 3 (Green)** — عدلي منصور ↔ الكيت كات (with rod-el-farag-corridor & Cairo University branches)
- Real interchange stations (الشهداء، أنور السادات، العتبة...) and ticket fare tiers

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| UI framework | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + custom keyframe animations |
| State management | Zustand |
| Routing | React Router v6 |
| HTTP client | Axios |
| Icons | lucide-react |
| Map & animation | Hand-authored SVG + `requestAnimationFrame` playback engine (no map library) |
| Routing algorithm | Custom Dijkstra implementation |

---

## 🚀 Getting Started

```bash
# 1. install dependencies
npm install

# 2. configure environment
#    copy .env.example to .env and adjust if needed

# 3. start the dev server
npm run dev

# 4. production build
npm run build

# typecheck
npm run typecheck
```

---

## 📁 Project Structure

```
src/
├── api/            # HTTP client, auth service, token storage
├── app/            # App root, protected routes, router
├── components/
│   ├── trip/       # InteractiveMetroMap, StationSelect, TripSummaryCard, AnimatedRouteView
│   ├── ui/         # Button, Card, Input, Label primitives
│   └── ...         # Loader, Logo, AuthShell, MetroTrain, ...
├── layouts/        # AdminLayout, PassengerLayout, ShellLayout
├── lib/            # metroData (network), routeFinder (Dijkstra), metroMapData (SVG coords)
├── pages/          # auth, passenger, dashboard pages
├── store/          # Zustand stores (auth, theme)
└── types/          # shared models
```

---

## 🔑 Demo Accounts

| Role | Email | Password |
|---|---|---|
| Passenger | `passenger@metro.eg` | `Metro1234` |
| Admin | `admin@metro.eg` | `Admin1234` |

---

## 📄 License

Private project — all rights reserved.
