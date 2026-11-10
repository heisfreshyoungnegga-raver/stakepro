---
name: StakePro Reconstruction — Green Rebrand
version: 1.0.0
colors:
  primary: "#00d563"        # brand green — replaces ALL gold as the primary accent
  primary-strong: "#00b34d" # pressed/active green
  primary-alt: "#00c853"    # secondary green accent
  primary-deep: "#00a86b"   # deep green — gradients, borders, legacy gold-deep slots
  primary-soft: "#3ee08a"   # soft green — light accents, chart/highlight tints
  surface: "#0a0c10"        # near-black app surface (unchanged)
  live-red: "#ff4f00"       # DO NOT TOUCH — live indicators
  error-red: "#dc2626"      # DO NOT TOUCH — errors
  link-blue: "#2563eb"      # DO NOT TOUCH — informational blue
typography:
  brand: "Existing site stack (unchanged) — this pass is colour + imagery only"
imagery:
  rule: "Real football photography only: players striking a ball, celebrating, stadium floodlights, fans. Green-graded (subtle green duotone lift in shadows) so photography sits inside the palette. Same file paths and near-same dimensions as the art it replaces — no reference may break."
---

# StakePro Reconstruction — Green Rebrand (2026-11-10)

## Overview

Prince's order: reconstruct the site's look — every gold element becomes
green, all photographic art becomes real football photography, and the
super admin gains two powers (per-admin commission, minimum-deposit
control). This document is the contract for that pass. Structure, layout
and copy do not change; colour tokens and imagery do.

## Colors

Gold is dead on StakePro. The mapping is total and mechanical:

| Was (gold family) | Becomes |
| --- | --- |
| #ffc72c, #ffca27, #ffca28, #f4c430, #f5c518, #f5c542, #ffd700 | #00d563 (primary) |
| #f59e0b, #eab308 | #00b34d (primary-strong) |
| #ffb800 | #00c853 (primary-alt) |
| #fbbf24, #facc15 | #3ee08a (primary-soft) |
| #fde047 | #86efac (pale green tint) |
| #d4af37, #d97706, #ca8a04 | #00a86b (primary-deep) |

8-digit alpha hexes map by their 6-digit base. rgba() gold triplets map to
the matching green triplet (245,158,11 → 0,179,77). Untouched on purpose:
live red #ff4f00, error red #dc2626, link blue #2563eb, all neutrals.

## Imagery

- Hero (`images/stakepro-football-hero.jpg`, 1942×809), players banner
  (`images/stakepro-players-v2.jpg`, 2206×713) and stadium banner
  (`images/football-stadium-banner.webp`, 1800×600) are replaced with real
  football photography at the same paths and dimensions, green-graded.
- The SP monogram (SVG logo, PNG logo, favicon, PWA icons) is regenerated
  in primary green on the same near-black surface, same paths.
- Virtual-club crests are fictional-club UI by design: kept, gold elements
  retinted green where the art allows.

## Components (admin additions)

- **Per-admin commission editor** (Super Portal → Users): each admin row
  shows its effective commission %; an inline number input + Save sets a
  custom rate (`POST /admin/set-commission`, super-only, 0–100, empty
  clears back to the global rate). Server enforces; UI only mirrors.
- **Minimum deposit field** (Super Portal → Platform Control → Rates):
  numeric GHS field bound to the `deposit_min_ghs` setting (10–5000,
  default 210), enforced by the ShinobiPay MoMo deposit handler.

## Do's and Don'ts

- Do audit to zero: no gold hex may remain in shipped CSS.
- Do keep every existing layout, class name and file path — tokens change,
  structure doesn't.
- Don't invent metrics or fields; admin UI reads only what the API returns.
- Don't touch reds, blue, or neutrals while chasing gold.
