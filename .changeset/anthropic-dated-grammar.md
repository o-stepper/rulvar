---
'@rulvar/anthropic': minor
---

Anthropic model resolution adopts the dated snapshot grammar (RV3303), the posture openai took in the v1.17.0 review P1-1. The old matcher let ANY suffix of a known name inherit the full table row, so an unseen variant like `claude-sonnet-5-preview` silently took the known model's caps and its promotional pricing, exactly the fabricated row the table's unknown model contract forbids; the 2026-08-12 comparison run named this counterexample. Now only the exact name or `<exact model>-YYYYMMDD` resolves a row; every other suffix falls through to the conservative unpriced caps, surfaces in `CostReport.unpriced`, and trips the ceiling warning instead of pricing as its neighbor. Dated snapshots of known names (`claude-haiku-4-5-20251001`) resolve byte identically to before.
