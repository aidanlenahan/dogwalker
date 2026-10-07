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

- Device / iOS version: iPhone, iOS 18.7 (Safari 27.0.1 engine)
- Installed to Home Screen: yes (`standalone=true`)
- Location permission: not recorded
- Date: 2026-10-07

## Results

Run each case with "Keep screen awake" **off** unless the case says otherwise. For each one, record fixes before/during/after, the gap length, and whether recording continued without touching anything.

Cases marked *Phase 8* weren't run in the spike; they're covered by real-walk testing (TODO Phase 8).

| # | Case | How | Result | Notes |
|---|------|-----|--------|-------|
| 1 | Screen on, app foreground | Walk ~5 min holding the phone | Partial | Standing still only: accuracy 7–15 m (median 7–12 m), `speed` always null. Fixes come in bursts, then every ~6–15 s when not moving. Walking baseline → *Phase 8* |
| 2 | Screen locked | Lock for 2 min, unlock | Stops, as expected | Run 2: locked 24 s, 0 fixes while hidden; fixes resumed on unlock without touching anything |
| 3 | App switch | Open another app 2 min, come back | Stops, as expected | Run 1: switches of 19 s and 38 s, 0 fixes while hidden; resumed on return |
| 4 | Wake lock on | Toggle on, put phone in pocket screen-on | Holds (screen on, in hand) | Run 1: held 3.5 min, 30 fixes, no hidden periods. Pocket + battery → *Phase 8* |
| 5 | Network loss | Airplane mode (keep Location on) ~2 min | *Phase 8* | |
| 6 | Reopen / restart | Swipe the app away, reopen, go to GPS test | *Phase 8* | |
| 7 | GPS loss | Indoors / underground | *Phase 8* | No errors in either run |
| 8 | Accidental refresh | Pull-to-refresh or reload | *Phase 8* | |
| 9 | Long walk | 30–60 min, normal use | *Phase 8* | |
| 10 | Paused alert | Notifications on (Settings). Start, lock the phone, wait | Works | ~18 s after locking (after the hidden-heartbeat fix) |
| 11 | Paused alert, offline | Airplane mode, then lock | *Phase 8* | Expect no alert while offline; nothing stale after reconnecting (2 min TTL) |

## Conclusion

- **Background tracking reliable?** No, as PRD §13.1 assumed: 0 fixes while hidden in every case. Recording picks back up by itself when the app returns to the foreground.
- **Wake lock:** keeps recording going with the screen on (3.5 min, no gaps). Pocket behavior and battery cost per 30 min still to measure on a real walk.
- **Paused alert:** arrives ~18 s after locking (15 s grace + up to 5 s check interval). iOS keeps a hidden page running 1–3 s, so heartbeats must stop while hidden (fixed). Offline behavior untested.
- **Live-recording UX for Phase 5:**
  - Wake lock on by default on Active Walk, with a visible "keep the app open" note.
  - If notifications are off, offer them on Active Walk too (the paused alert is the safety net).
  - Show gaps from hidden periods as breaks in the route; don't draw a line across them.
- **Impact on Phase 5 design:** no change to the plan. Two details:
  - iOS sends fixes only every ~6–15 s while standing still, so a long time between fixes isn't a gap by itself. Detect gaps from hidden periods (visibility events), not from fix spacing alone.
  - `speed` can be null; compute pace from distance/time, not from `coords.speed`.
