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

- [x] Cloudflare Tunnel `dogwalker-pwa` → `dogwalker.aidanlenahan.com` (systemd: `cloudflared-dogwalker`)
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
- [ ] **Done when:** the app installs to an iPhone Home Screen from `dogwalker.aidanlenahan.com` and you can log in

## Phase 2 — GPS feasibility spike (PRD §13, de-risk early)

- [ ] Throwaway page using `watchPosition` that logs samples to IndexedDB and shows count/accuracy
- [ ] Test on iPhone as an installed PWA: screen on, screen locked, app switch, network loss, reopen, GPS loss
- [ ] Write down what works in `docs/gps-findings.md`. If background tracking isn't reliable, record the limitation and move on (PRD says don't block MVP)

## Phase 3 — Dogs, walk lifecycle, events (Milestones 2 + 4)

- [ ] Dogs CRUD API + pages (`/dogs`, `/dogs/:id`): name, owner name, notes (photo later)
- [ ] Walk API: create, start, finish (`/api/walks/{id}/finish` sets `ended_at`, computes stats, status → `completed`)
- [ ] New Walk page: pick or create a dog, tracking toggles, pre-walk note
- [ ] Active Walk page: dog name, elapsed timer, Finish button
- [ ] Events API (`/api/walks/{id}/events`): `pee | poop | water | fed | note | other`, timestamp, optional note/lat/lng; edit and delete while not published
- [ ] Quick-log buttons (Pee/Poop/Water/Fed/Note) + recent-activity list on Active Walk
- [ ] **Local-first active walk:** persist active walk + unsent events in IndexedDB; queue and retry API writes; survive refresh/PWA restart
- [ ] Dashboard: New Walk button, prominent active walk with Resume, recent walks
- [ ] Walk history list + walk detail (`/walk/:id`)
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
- [ ] Buffer points locally (IndexedDB) and batch-upload to `/api/walks/{id}/points`
- [ ] Accuracy filtering (reject or flag poor-accuracy points; ignore implausible jumps)
- [ ] Distance from accepted sequential points (haversine), duration, average pace. Compute server-side on finish, live estimate client-side
- [ ] Map component (Leaflet + OSM tiles behind a provider abstraction): current position, live polyline, fit-to-route
- [ ] Route + stats on Active Walk, Review, and client report (unlisted)
- [ ] Event lat/lng captured from latest position
- [ ] **Done when:** a real outdoor walk produces a reasonable route and distance

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

- [ ] Remember last-used tracking options on New Walk
- [ ] Time-of-day greeting, dog shortcuts on dashboard
- [ ] Report visual polish pass (typography, stat tiles, map styling)
- [ ] Accessibility pass (contrast, tap targets, screen reader labels)

---

## Out of scope for MVP (PRD §4, §37)

Payments, invoicing, booking/scheduling, calendar, owner accounts/messaging, multiple walkers/teams, native apps, live client tracking, push notifications, PDF reports, weather, AI summaries, advanced analytics, expiring links, privacy zones/home redaction. Revisit after Phase 8.
