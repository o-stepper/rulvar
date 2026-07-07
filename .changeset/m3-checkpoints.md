---
'@lurker/core': minor
---

M3-T02 turn-boundary checkpoints. The runtime writes a canonical-history
checkpoint into TranscriptStore at every turn boundary where the loop
continues (tool boundaries and schema re-prompts), at a deterministic ref
derived from the dispatch seq; the terminal entry records checkpointRef.
A dangling-dispatch resume (kill-and-resume) re-enters at the last
boundary with zero re-paid turns, restored usage folds into the terminal
exactly once, and an unreadable or unknown-format blob falls back to a
full redispatch (tools stay at-least-once between execution and the
checkpoint write). The blob format is engine-internal with a leading
format byte; replayed agents recover their turn count from the checkpoint
and re-emit tool:start/tool:end with the replay marker.
