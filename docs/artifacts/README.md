# Artifacts — process evidence

## `c4-autopilot-attempt.diff` + `../screenshots/autopilot-attempt/`

A preserved snapshot of the **first, autonomous** attempt at the Cycle 4
"Remote + Card Printer" visual redesign. **This code was never shipped.** It is
kept only as evidence for the process write-up.

### What happened

The Cycle 4 kickoff prompt asked Kiro to "create a steering doc, then spec **and
implement** it." With that wording, Kiro's task-runner executed the entire
18-task plan in one pass — spec → all implementation → its own Playwright visual
QA — rather than stopping after the spec for per-task human review.

### Why it was rejected

The autonomous build was **technically correct and fully working**: 115/115 tests
green, `tsc` clean, and every platform/accessibility gate passed (fonts genuinely
self-hosted, CSS-only animation, `prefers-reduced-motion` end-states, the tab
opening synchronously on press, byte-exact frozen strings, corner-mode gating,
the provenance fallback, the ouroboros route intact).

It was still **wrong**. It diverged substantially from the locked design comp
(`RemotePrinter`): soft blurred shadows instead of the flat hard offset-shadow
language; a rectangular SURF key instead of the circular power button; dark
2-column mood keys instead of light 3-column chiclets; a dark tuned screen
instead of the off-white tune-in; a card that slides up instead of printing down
from a slot under the telly; and a missing TV stand, press-note, rolling channel
counter, and the `TUNING > CH n` LCD read.

### The lesson

Automated verification proves *"it runs"* — it cannot prove *"it is what we
specified."* Green tests and passing gates were not enough; only a human reading
the diff against the design intent caught the divergence. The shipped Cycle 4
build was rebuilt from a corrected spec, task by task, with a human gate on each.

### Files

- `c4-autopilot-attempt.diff` — the full autonomous implementation as a patch
  against the pre-Cycle-4 commit (`de7ddf0`). Apply read-only for reference;
  do not merge.
- `../screenshots/autopilot-attempt/redesign-*.png` — Kiro's own Playwright
  captures of the autonomous output (desktop, phone, corner mode, mood selected,
  ouroboros).
