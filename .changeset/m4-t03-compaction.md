---
'@lurker/core': minor
---

M4-T03 compaction ownership. The Agent Runtime owns compaction
(`runtime/compaction.ts`):

- Compaction is ON by default for every agent at threshold 0.8 of the
  loop model's contextWindow (docs/06 Appendix A);
  `AgentProfile.compaction.threshold` adjusts it per profile. The
  context estimate is the last loop turn's inputTokens + outputTokens.
- At a tool turn boundary past the threshold the summarize role fires
  through the resolution chain (falling back to the loop model when
  routing resolves no summarize model; the low role-effort default
  applies either way), and the transcript after the first message is
  replaced by one user-role summary message. The summarize request is
  projected like any other and carries the tool contracts with
  toolChoice 'none'.
- Compaction points (the turn numbers at which compaction fired) ride
  every checkpoint and restore verbatim: a resumed run continues from
  the compacted history and never re-summarizes it. Full-journal replay
  stays free as before.
- A failed or empty summarize disables compaction for the rest of the
  run with a warning instead of failing paid work; budget and
  cancellation aborts propagate normally.
