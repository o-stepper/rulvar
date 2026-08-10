---
'@rulvar/core': minor
'@rulvar/cli': minor
---

`rulvar inspect` reports the logical run and what the contract refused (RV2605). Two surfaces shipped in v1.228.0 had no consumer in the tool people actually read a run with: `inspect` printed `entries: N`, which over a resumed run is one undifferentiated heap with no boundaries in it, and said nothing at all about finish candidates the declared contract rejected.

`segments:` is `logicalRunTelemetry` (RV2510) printed: how many segments ran, how each settled, how many entries each appended, and the count of entries that continued PAST the last settle (RV1407) when there are any, because the last settled status is then not the run's last word. `rejected finish candidates:` lists the RV2507 rows with verdict, size, hash prefix, failing validators, and the blob ref when the bytes were retained, and counts DISTINCT documents beside the row count, so three rows sharing one hash reads as the model serving one text three times rather than as three genuine attempts.

`lastRunSettle` gains `rejectedFinishCandidates`. The settle already persists the whole completion lift, so this is a read of what is recorded, not a re-fold and not a validator re-run, and every row is parsed defensively: any malformed row drops the WHOLE list, the same posture the live lift takes, because a partial history read as complete under-reports exactly the runs that misbehaved most, and offline is where nobody can check. A journal that records nothing of the kind reads as NOT RECORDED and both lines stay absent.
