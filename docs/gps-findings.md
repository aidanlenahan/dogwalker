# GPS feasibility findings (TODO Phase 2)

Question (PRD §13): can an iPhone Home Screen PWA keep recording `watchPosition` samples through a real walk, and if not, which situations break it?

Decision already taken (PRD §13.1): live recording is foreground-only with a screen wake lock, GPX import is the reliable fallback, native is post-MVP (§37.1). These tests confirm the details and set the Active Walk UX (how loud the "keep the app open" warning needs to be, whether wake lock is enough).

Test tool: the throwaway page at `/dev/gps` (link "GPS test (dev)" on the dashboard). It logs every fix and lifecycle event (visibility, pagehide/pageshow, online/offline, wake lock) to IndexedDB, reports gaps over 15 s and whether the app was hidden during each one, and exports JSON + GPX.

## Early results (2026-10-07)

- Push notifications arrive on the iPhone Home Screen app.
- Live GPS with the app open records normally, judged from use rather than the full matrix below.
- "Keep screen awake" (wake lock) works when enabled: no hidden periods once it was on.
- iPhone, iOS 18.7, installed (`standalone=true`). Run `testexports/gps-spike-2026-10-07T04-47-10-606Z`: two app switches (19 s, 38 s) gave 0 fixes while hidden, as expected; fixes resumed on return. With wake lock on, fixes kept coming but often only every ~15 s while standing still.
- The paused alert did **not** arrive in that run. Cause: iOS kept the hidden page running for 1–3 s, and a heartbeat sent in that window cancelled the alert. Fixed: no heartbeats while hidden, and the server ignores hidden ones.
- Retest after the fix (`testexports/gps-spike-2026-10-07T05-03-46-734Z`): locked at 05:03:52, alert sent 05:04:10 (18 s = 15 s grace + up to 5 s check interval) and arrived on the phone.

## Setup

- Device / iOS version:
- Installed to Home Screen: yes / no (`start` event logs `standalone=`)
- Location permission: While Using / Ask Next Time / Precise on?
- Date:

## Results

Run each case with "Keep screen awake" **off** unless the case says otherwise. For each one, record fixes before/during/after, the gap length, and whether recording continued without touching anything.

| # | Case | How | Result | Notes |
|---|------|-----|--------|-------|
| 1 | Screen on, app foreground | Walk ~5 min holding the phone | | baseline fix rate and accuracy |
| 2 | Screen locked | Lock for 2 min, unlock | | `fixes while hidden` > 0? |
| 3 | App switch | Open another app 2 min, come back | | |
| 4 | Wake lock on | Toggle on, put phone in pocket screen-on | | does it hold? battery? |
| 5 | Network loss | Airplane mode (keep Location on) ~2 min | | fixes still arrive? `(offline)` tags |
| 6 | Reopen / restart | Swipe the app away, reopen, go to GPS test | | `resumed` event, gap length |
| 7 | GPS loss | Indoors / underground | | errors? accuracy jump? |
| 8 | Accidental refresh | Pull-to-refresh or reload | | |
| 9 | Long walk | 30–60 min, normal use | | gaps, battery used |
| 10 | Paused alert | Notifications on (Settings). Start, lock the phone, wait | Works | ~18 s after locking (after the hidden-heartbeat fix) | push within ~15 s? tapping it reopens `/dev/gps`? cleared on return? |
| 11 | Paused alert, offline | Airplane mode, then lock | | no alert while offline; nothing stale after reconnecting (2 min TTL) |

## Conclusion

- Background tracking reliable? 
- Does wake lock keep recording going with the phone in a pocket (screen on)? Battery cost per 30 min:
- Paused alert delay and reliability (cases 10–11):
- Live-recording UX for Phase 5 (warning wording, gap display):
- Impact on Phase 5 design:
