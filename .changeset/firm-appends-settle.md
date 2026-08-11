---
'@rulvar/core': minor
---

A lost journal append now fails the settle closed (RV3201). Deterministic shims journal fire-and-forget through the serialized append queue, whose chain swallows rejections to keep later appends flowing, and the settle barrier used to swallow the flush verdict on top, so a failed persist was visible to nobody: the run settled `ok/complete` over a journal missing a record it believes it wrote, and a resume regenerated a different `ctx.random()` value without one provider call. The first lost append now latches in the Replayer, `flush()` rethrows it as the new typed `JournalIntegrityError`, and the engine converts a would-be `ok` (or `suspended`) outcome into an `error` terminal whose settle decision records the converted status. Runs that never lose an append are byte identical.
