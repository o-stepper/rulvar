---
'@rulvar/core': minor
'@rulvar/cli': minor
---

RV4410: opt-in coordination checkpoints. With `coordinationCheckpoints: true`, every settled await round appends a compact `coordination_checkpoint` decision (the round ordinal, the settled handles, the spend at the checkpoint), so a timeout or kill terminal shows how far coordination durably got, and a resumed run's journal visibly continues from round N+1 instead of an opaque prefix. The seventh comparison experiment's genesis segment died on a timeout mid-coordination and the post-mortem priced the re-coordination by hand; the checkpoint makes the durable progress a journal fact. An await round the kill interrupted journals NOTHING, honestly: coordination got no farther than the journal says. Opt-in because the decisions are journal bytes; without the flag every journal stays byte identical, and the replay machinery never re-pays journaled coordination either way. `rulvar inspect` prints the last checkpoint (round, settled children, spend) when one exists.
