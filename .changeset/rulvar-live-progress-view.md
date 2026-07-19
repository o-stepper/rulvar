---
'@rulvar/rulvar': minor
---

New live terminal progress view: `progress(source, options)` renders a claude-workflows-style tree over the WorkflowEvent stream with one row per agent (status glyph, running timer, token counts, USD), per-role sub-timings when one call spans several invocation phases, the run header with spend against the ceiling, banners for pending approvals and externals, and a final summary including the per-role dollar split from `RunOutcome.cost.byRole`. Accepts a `RunHandle` (subscribes via `on()`, leaving `handle.events` free), a promise of one, or a raw event iterable (the gapless resume path). TTY mode repaints in place at a bounded rate; pipes and CI degrade to append-only lines; `NO_COLOR`, injectable sink and clock, and stderr-only output keep it deterministic and clean. The minimal `renderProgress` is unchanged.
