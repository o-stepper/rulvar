---
'@lurker/core': minor
'@lurker/testing': minor
---

M2-T09/T10: engine.resume under the run-to-definition binding contract
(wf required for in-process runs, name mismatch is a typed ConfigError,
body-hash mismatch warns loudly and proceeds; the compatibility scan
runs strictly before any side effect; the resumed run seeds the budget
from the ledger fold, re-emits open suspensions, and reports
ResumePreview hits/misses/reruns/orphans plus invalid offline
resolutions), the dryRun option (replay-strict matching: the first
would-be-live call settles the run with the typed journal_miss error and
zero live calls), and @lurker/testing replayRun (tier 3: strict replay
of any journal with JournalMissError on ANY live call; suspended
journals finish suspended with zero live calls).
