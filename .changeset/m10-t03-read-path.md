---
'@rulvar/core': minor
'@rulvar/plan': minor
---

M10-T03: the ModelKnowledge read path (docs/05, sections "Read path" and "Security"). kb_pinned and kb_repinned land, the card renders, and the whole feature is store-gated: an engine without `stores.modelKnowledge` writes no kb entries at all, so every existing journal and cassette stays byte-stable (zero added awaits on the off path).

- `createEngine` accepts `stores.modelKnowledge`; the runtime holds ONLY the `current()` handle (commit is physically absent inside runs).
- One read at run admission for orchestrate-role runs: the engine filters claims (active, unexpired, reachable through the run's declared ladders after the role-floor filter) and journals `kb_pinned { version, hash, cardText }` with the card bytes EMBEDDED, strictly before the first orchestrator turn. Resume and replay read the entry bytes and never touch the live store.
- A fresh `kb_repinned` lands on every wait_for_events wake under the same filtering rules against a FRESH store read, so expired, stale, and archived claims never steer spawns after pauses; a mid-run store commit affects only subsequent pins.
- `modelKnowledgeCard`: deterministic, two-layer, tier-relative, 4096-char budget (oldest notes withhold behind an explicit marker). The verified layer compiles EXCLUSIVELY from eval-measured claims (empty in phase 1) with the one-rung clamp; editorial notes render dated and explicitly marked, never compiled into a tier; the orchestrator never sees model names. The card docks into the spawn tool description beside the profile card.
- OQ-11 closes: editorial notes render for every taskClass with no self-description suppression (the nameless tier-relative render already blunts the feared bias).
- Two catalog cassettes (docs/09, new section 6.11): kb-pin-replay and kb-repin-expiry, recorded offline over a deterministic stub store with time-stable dates; the cassette-catalog CI job runs them.
