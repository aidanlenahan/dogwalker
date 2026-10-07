# TODO

Source: [docs/PRD.md](docs/PRD.md). Ordered by what has to exist first, then by priority (the core workflow is **Start → Record → Finish → Review → Publish → Share**), then by feasibility/risk.

This order differs from the PRD milestones in a few places:

- **GPS feasibility spike moved early.** iOS PWA background GPS (PRD §13) is the biggest unknown. A throwaway test page answers it cheaply before the app is built around assumptions.
- **Events folded into the walk lifecycle.** They're simple rows and make the no-GPS walk meaningful.
- **Report & sharing moved ahead of full GPS and photos.** A text-only report link is the core value. Getting the end-to-end flow working first means every later feature lands in a working pipeline.
- **Local-first active-walk state built in from the start**, not retrofitted (PRD §13, §26: "an interruption must not silently destroy an entire walk").
- **Public profile and testimonials last.** They're not part of the MVP definition (PRD §36).

---

## Phase 0 — Hosting (mostly done)

- [x] Cloudflare Tunnel `dogwalker-pwa` → `dogwalker.alenahan.net` (systemd: `cloudflared-dogwalker`)
- [x] Placeholder origin on `127.0.0.1:5173` (systemd: `dogwalker-placeholder`)
- [X] Confirm the placeholder page loads in a phone browser over HTTPS
- [ ] Cloudflare: make sure share links (`/w/*`), `/u/*` and `/api/*` aren't blocked by the bot challenge for normal clients and link-preview fetchers (WAF skip rule or lower Security Level for this hostname)

## Phase 1 — Foundation (PRD §34, §28–31, Milestone 1)

Repo & tooling
- [x] Monorepo layout: `frontend/`, `backend/`, `docs/` (move `PRD.md` there), `README.md`
- [x] `.env.example` with all required settings; real `.env` stays git-ignored
- [x] `docker-compose.yml` for local dev: postgres (no published port in prod), backend, frontend (written, not yet run: Docker isn't installed on this host)
- [x] Basic lint/format/test setup for both halves

Backend (FastAPI)
- [x] App skeleton, settings from env vars, `/api/health`
- [x] PostgreSQL connection + migrations (e.g. SQLAlchemy + Alembic)
- [x] Initial schema: `users`, `dogs`, `walks`, `walk_events`, `gps_points`, `photos`, `testimonials` (PRD §31)
  - `walks.status`: `created | active | completed | published`
  - `walks.visibility`: `private | unlisted | public`
  - `walks.share_token`: unique, nullable, never sequential
- [x] Auth: login, logout, persistent session (httpOnly secure cookie), modern password hashing (argon2/bcrypt), multi-user capable
- [x] CLI/script to create the walker account (no public sign-up)
- [x] Ownership checks on every management endpoint (server-side, PRD §25): `get_owned()` helper in `app/deps.py`; use it in every Phase 3+ endpoint

Frontend (React + TypeScript + Vite)
- [x] App skeleton, router with PRD §28 routes (stubs OK)
- [x] API client (`services/api.ts`) with session handling
- [x] Login page + auth guard, logout
- [x] Mobile-first layout shell, large touch targets
- [x] PWA: manifest, icons, standalone display, service worker with app-shell caching

Deploy
- [x] Production serving on this host: built frontend + FastAPI behind one localhost origin (e.g. Caddy/nginx, or FastAPI serving `dist/`)
- [x] systemd/compose units for the app; retire `dogwalker-placeholder`; update `cloudflared/config.yml` if the port changes
- [x] **Done when:** the app installs to an iPhone Home Screen from `dogwalker.alenahan.net` and you can log in

## Phase 2 — GPS feasibility spike + notifications (PRD §13, de-risk early)

Decision already made (PRD §13.1): live GPS is foreground-only with a wake lock; GPX import is the reliable fallback; native is post-MVP (§37.1). This spike now just confirms the details on your phone: how fast iOS stops after locking, and whether the wake lock holds in a pocket.

- [x] Throwaway page using `watchPosition` that logs samples to IndexedDB and shows count/accuracy (`/dev/gps`, linked from the dashboard; also logs lifecycle events, gaps, wake lock toggle, JSON/GPX export)
- [x] Web Push (PRD §13.3): `push_subscriptions` table, VAPID keys (`python -m app.cli generate-vapid-keys`), `/api/push/*`, custom service worker (`src/sw/sw.ts`) with push + notification click
- [x] Notification permission UX: first-sign-in sheet, banner on each launch while off (X to dismiss, Settings button), `/settings` page with on/off + test notification
- [x] GPS-paused alert (PRD §13.2): heartbeat every 5 s + hidden beacon (`services/liveTracking.ts`) → server watchdog (`app/tracking.py`) pushes "GPS recording paused"; wired into `/dev/gps`
- [x] Deploy (`deploy/deploy.sh`), reinstall/reopen the Home Screen app, turn on notifications in Settings, send a test notification
- [x] Test on iPhone as an installed PWA: screen locked, app switch, wake lock (screen on), **paused alert arrives after locking** (~18 s). Remaining cases moved to Phase 8
- [x] Fill in `docs/gps-findings.md`: background tracking confirmed impossible, wake lock holds, paused alert works; Phase 5 notes on gap detection and null `speed`

## Phase 3 — Dogs, walk lifecycle, events (Milestones 2 + 4)

- [x] Dogs CRUD API + pages (`/dogs`, `/dogs/:id`): name, owner name, notes (photo later)
- [x] Walk API: create, start, finish (`/api/walks/{id}/finish` sets `ended_at`, computes stats, status → `completed`)
- [x] New Walk page: pick or create a dog, tracking toggles, pre-walk note
- [x] GPS mode choice on New Walk (PRD §12.1): "Record live (keep the app open)" vs "Record on another device, upload GPX later"; store on the walk
- [x] Active Walk page: dog name, elapsed timer, Finish button
- [x] Events API (`/api/walks/{id}/events`): `pee | poop | water | fed | note | other`, timestamp, optional note/lat/lng; edit and delete while not published
- [x] Quick-log buttons (Pee/Poop/Water/Fed/Note) + recent-activity list on Active Walk
- [x] **Local-first active walk:** persist active walk + unsent events in IndexedDB; queue and retry API writes; survive refresh/PWA restart
- [x] Dashboard: New Walk button, prominent active walk with Resume, recent walks
- [x] Walk history list (`/walks`) + walk detail (`/walk/:id`)
- [ ] Deploy and try a real walk on the iPhone (start, log, refresh/close the app mid-walk, finish)
- [ ] **Done when:** a walk goes `created → active → completed` with events, without GPS, and survives a refresh mid-walk

## Phase 4 — Review, publish, share (Milestone 6, core value)

- [ ] Review page: dog, date, start/end, duration, events, final notes; edit notes, delete events, fix basic info
- [ ] Publish endpoint: status → `published`, generate a cryptographically random share token (e.g. `secrets.token_urlsafe(16)`+)
- [ ] Public API `/api/public/walks/{token}`: no auth, returns only report-safe fields, no internal IDs
- [ ] Client report page `/w/:shareToken`: polished, mobile-friendly, no login
- [ ] Share screen: Copy Link (always), Web Share API where supported, visibility selector (default Unlisted)
- [ ] Open Graph/meta tags so the texted link previews nicely
- [ ] Tests: token is unguessable, can't reach other walks from a token, unpublished walks 404 publicly
- [ ] **Done when:** you finish a walk and text the report link to an owner, who opens it with no account

## Phase 5 — GPS tracking & maps (Milestone 3, §12, §32)

- [ ] `services/geolocation.ts`: continuous `watchPosition` during active walk, GPS status indicator
- [ ] Save every fix to IndexedDB as it arrives; batch-upload to `/api/walks/{id}/points` every ~5 s while online
- [ ] Reuse `LiveTrackingReporter` on Active Walk (session = walk id, resume URL `/walk/:id/live`); `stop()` on Finish
- [ ] Accuracy filtering (reject or flag poor-accuracy points; ignore implausible jumps)
- [ ] Distance from accepted sequential points (haversine), duration, average pace. Compute server-side on finish, live estimate client-side
- [ ] Screen wake lock on Active Walk, on by default (re-acquire on return to foreground) + "keep the app open" hint; offer notifications if off
- [ ] Show GPS gaps honestly: detect them from hidden periods, not fix spacing (iOS sends fixes only every ~6–15 s when standing still; see `docs/gps-findings.md`). Pace from distance/time (`coords.speed` is often null)
- [ ] Map component (Leaflet + OSM tiles behind a provider abstraction): current position, live polyline, fit-to-route
- [ ] Route + stats on Active Walk, Review, and client report (unlisted)
- [ ] Event lat/lng captured from latest position
- [ ] `walks.route_source` column (`none | live | import`) + migration
- [ ] **GPX import** (PRD §12.1): upload a `.gpx` on the Review page → `POST /api/walks/{id}/route/import`; parse server-side with `defusedxml`, size limit, keep only points inside the walk's start/end window, replace live points, recompute stats
- [ ] Geotag location-less events by timestamp against the imported track
- [ ] Help articles at `/help` (static Markdown, PRD §12.1): recording live with the app open; exporting GPX from Garmin Connect, Strava, and Apple Watch (via HealthFit / WorkOutDoors). Link them from New Walk and the Review page's GPX upload
- [ ] "Upload later" walks: skip live GPS on Active Walk, show GPX upload prominently on Review
- [ ] Tests: GPX parsing (multiple segments, no timestamps, malformed/XXE input), window clipping, stats after import
- [ ] **Done when:** a real outdoor walk produces a reasonable route and distance, recorded live **or** imported from a watch GPX

## Phase 6 — Photos (Milestone 5, §14)

- [ ] Photo capture/upload from the Active Walk and Review pages (`<input type="file" accept="image/*" capture>`)
- [ ] Client-side compression/resize before upload
- [ ] Server: validate type, enforce size limit, strip EXIF location, store outside web root with random names
- [ ] Photo API (`/api/walks/{id}/photos`): upload, caption, delete before publish
- [ ] Gallery on Review and client report; serve photos for published walks only via the share-token route
- [ ] Queue photo uploads offline like points/events
- [ ] Optional dog photo on dog profile
- [ ] **Done when:** photos taken during a walk appear in the published report

## Phase 7 — Offline & sync hardening (§26)

- [ ] Unified sync queue for events, points, photos with idempotent server writes (client-generated IDs)
- [ ] Sync-state UI ("Offline · 17 GPS points waiting to sync")
- [ ] Block or warn on Finish/Publish while data is unsynced
- [ ] Service worker: don't cache API responses that should be live; handle app updates cleanly

## Phase 8 — Real-world testing (Milestone 8, §36)

- [ ] Several real walks on iPhone Home Screen PWA
- [ ] Test: screen on/locked, app switching, cellular loss, GPS drift, long walks, accidental refresh, PWA restart, photo uploads, sharing
- [ ] GPS cases left from the spike (`docs/gps-findings.md`): walking baseline, wake lock in a pocket + battery per 30 min, GPS paused alert while offline
- [ ] Record limitations and bugs in `docs/field-testing.md`; fix blockers
- [ ] Security pass against the PRD §25 checklist (HTTPS, no sequential public IDs, input validation, upload limits, DB not exposed, no secrets in git)
- [ ] Backups for PostgreSQL + photo storage

## Phase 9 — Public profile & testimonials (Milestone 7, §22–23)

- [ ] Profile edit (`/profile/edit`): display name, photo, service area, bio, username
- [ ] Public profile `/u/:username` + `/api/public/users/{username}`
- [ ] Aggregate stats: walk count, total distance, total time
- [ ] Testimonials CRUD (manual): client display name, text, optional rating, visibility
- [ ] Public walks on profile: **no exact GPS route**, no client-identifying info by default
- [ ] **Done when:** the walker has a usable public profile

## Phase 10 — Polish

- [x] Remember last-used tracking options on New Walk (done in Phase 3)
- [ ] Time-of-day greeting, dog shortcuts on dashboard
- [ ] Report visual polish pass (typography, stat tiles, map styling)
- [ ] Accessibility pass (contrast, tap targets, screen reader labels)

---

## Out of scope for MVP (PRD §4, §37)

Native iOS/Android shell for background GPS + direct HealthKit/Garmin sync (PRD §37.1: Capacitor/Expo, needs the $99/yr Apple Developer account). Payments, invoicing, booking/scheduling, calendar, owner accounts/messaging, multiple walkers/teams, live client tracking, push notifications beyond the GPS-paused alert, PDF reports, weather, AI summaries, advanced analytics, expiring links, privacy zones/home redaction. Revisit after Phase 8.
