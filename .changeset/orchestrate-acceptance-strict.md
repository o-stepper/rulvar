---
'@rulvar/core': minor
'@rulvar/cli': minor
---

Add the orchestrate acceptance policy and the CLI --strict flag (the v1.40.0 improvement plan's completion contract)

Run status ok proves that finish validated, and nothing more: the model may
call finish after any mix of child outcomes, so ok alone never proves the
children succeeded. The new opt in OrchestrateOptions.acceptance turns that
into a checked contract. childPolicy 'all-ok' requires every spawned child to
have settled ok when finish validates (a child still running counts against
it); { minSuccessful: N } tolerates failures beyond the first N successes.
The verdict is journaled as one decision entry, so a resume rolls the same
verdict forward, immune to drift of the live options. An accepted result
becomes the acceptance envelope { result, completion, childStatusCounts,
degradedReasons }; a violated policy fails the run with the typed
FailRunError (code fail_run, data.source 'orchestrator_acceptance') instead
of settling ok. Without acceptance nothing changes: the result value stays
the raw finish payload and no new journal entry is written.

The CLI pairs with the envelope: rulvar run --strict and rulvar resume
--strict exit nonzero when a settled ok value reports completion 'partial',
printing the degraded reasons (strictExitCode is exported for hosts). The
guides also now state the adjacent contracts plainly: await_any and await_all
return truncated TaskDigests rather than full child reports, cost totals are
price registry estimates with usageApprox marking estimated usage, the
fencing epoch covers journal appends while RunMeta and transcript blobs stay
advisory projections, and data protection at rest is owned by the host.
