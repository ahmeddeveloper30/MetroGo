# Smart Metro — Implemented Features (demo-ready)

All verified live in the browser on `http://localhost:5173` (dev server, mock backend `USE_MOCK=true`).

## Authentication (real flows)
- Login page with validation, error states, show/hide password
- Register page with full validation + success animation scene
- Role-based redirect: Passenger → `/app`, Admin → `/dashboard`
- Logout on desktop sidebar + mobile top bar (verified working)

## Passenger
| Feature | Where | Notes |
|---|---|---|
| Home dashboard | `/app` | Greeting, service notice, quick trip widget, next trains (mock-labeled), line status, quick services |
| **Trip planner** | `/app/trip` | Dijkstra on real network (84 stations, 3 lines + branches), 2 min/hop + 5 min/transfer, searchable station selectors (Arabic + English + line badges), swap, presets |
| **Interactive metro map** | `/app/trip` | Full-network SVG (lines in official colors, Nile, interchanges), animated journey playback (play/pause/restart/×0.5–×4 speed/next station), moving train, live journey info panel |
| Trip summary | `/app/trip` | Duration, stops, lines used, ticket fare tiers 15/20/25/30 EGP |
| Step-by-step timeline | `/app/trip` | Collapsible accordion with interchange walk steps |
| Profile | `/app/profile` | Real API-backed profile view |

## Admin
| Feature | Where | Notes |
|---|---|---|
| Admin shell & sidebar | `/dashboard` area | Role-protected layout, collapsible sidebar, 9 admin routes |
| Admin pages content | all admin routes | **PageStub placeholders** — see planned_features.md |
