# GPS feasibility findings (TODO Phase 2)

Question (PRD §13): can an iPhone Home Screen PWA keep recording `watchPosition` samples through a real walk, and if not, which situations break it?

Decision already taken (PRD §13.1): live recording is foreground-only with a screen wake lock, GPX import is the reliable fallback, native is post-MVP (§37.1). These tests confirm the details and set the Active Walk UX (how loud the "keep the app open" warning needs to be, whether wake lock is enough).

Test tool: the throwaway page at `/dev/gps` (link "GPS test (dev)" on the dashboard). It logs every fix and lifecycle event (visibility, pagehide/pageshow, online/offline, wake lock) to IndexedDB, reports gaps over 15 s and whether the app was hidden during each one, and exports JSON + GPX.

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

## Conclusion

- Background tracking reliable? 
- Does wake lock keep recording going with the phone in a pocket (screen on)? Battery cost per 30 min:
- Live-recording UX for Phase 5 (warning wording, gap display):
- Impact on Phase 5 design:
