---
'@lurker/testing': minor
---

M9-T04 (final part): the DEF-4 live re-record, production-journal replay, and the one-CI-job catalog gate (docs/09 section 6; docs/10 M9 row "Complete catalog green in one CI run"; the 1.0 gate of docs/12 section 5).

- The six DEF-4 cassettes are re-recorded through the LIVE producers per the synthetic-fixture rule: engine runs, RunHandle.resolveExternal, and the offline kernel writer (the M8 machinery) produce the committed journals; recordLiveCassettes gains the six recorders and scripts/record-m3-cassettes.mjs regenerates them. The synthetic builders stay in the suite as the kernel regression (def1-def4.test.ts now replays the builder output for DEF-4), and the new def4-live.test.ts replays the committed live forms end-to-end, seq-agnostic.
- Production-journal replay is wired: dogfood journals live under the frozen `journals/` directory and every one replays STRICT with zero live calls against its shipped workflow (examples/src/journals.test.ts; RECORD_DOGFOOD=1 re-records). Seeded with judge-panel-fake, a full run of the shipped judge-panel example.
- The catalog gates as ONE CI job: `cassette-catalog` runs scripts/catalog-audit.mjs (every docs/09 section 6 ID must resolve to a cassettes/ fixture or a named suite; 58 IDs today, parser-drift guarded) and then a single vitest invocation over every cassette suite (the M2/M3/M9 fixture suites, the M7/M8/M9 plan cassettes, the M8 multi-process soak, and the dogfood journals), replay-strict with zero live calls.
