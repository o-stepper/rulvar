---
'@rulvar/core': minor
'@rulvar/cli': minor
---

The offline child roster names the children the run ABANDONED (RV2804).

`childRostersFromJournal` presented a child on a discarded branch exactly like a child whose work the run kept, so a post-mortem reading "four children settled ok" was counting branches the orchestration had thrown away. The money layer has refused that conflation since RV1904: `grossUsd` keeps abandoned spend because the provider billed it, `totalUsd` does not because the run kept none of it. The roster now says the same thing.

`JournaledChild.abandoned` is present and true exactly when the first-wins abandon projection covers that child's dispatch, subtree coverage included, and absent otherwise, never false (RV1209). It needs nothing that was not already written down: the fold reads the same projection the replayer disposes by, over the same journal, and a child's `handle` is the very seq an abandon entry targets, so journals from every prior version answer.

`rulvar inspect` prints the discarded children under the roster it already prints, named by their handles.
