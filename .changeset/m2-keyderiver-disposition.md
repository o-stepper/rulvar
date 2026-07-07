---
'@lurker/core': minor
---

M2-T05/T06: the hashVersion mechanism and the canonical replay predicate.
Frozen KeyDeriver profiles (v2 current; v1 with the effort-stripping
projection, round-1 disposition table, and foldDefaults), the per-engine
deriver registry with extraDerivers validation as the only window
extender, the side-effect-free compatibility scan raising
JournalCompatibilityError with sub-codes and hints, versioned matching
through the registry KeyRing (live calls projected DOWN, incomparable is
a guaranteed non-match, keys memoized per call and version); the single
canonical replayDisposition with the three kernel amendments
(memoizeOutcome on task-class failures via classifyAgentError,
abandon-derived skipped through the append-order AbandonFold with
transitive child-scope coverage, escalated-replays-as-ok), version
dispatch by the entry's own profile, and the invalidate/retry unpinning
API. @lurker/compat ships the extraDerivers plumbing plus the synthetic
hashVersion 0 deriver (manually versioned 0.1.0 per the lockstep
exemption).
