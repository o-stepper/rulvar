---
'@rulvar/core': minor
---

The price table provenance grows its content tail (RV3703, the R11 remainder of the third comparison experiment's arc). Every pinned pricing segment, and the snapshot's top level, now carries `rowsHash` (sha256 over the canonical JSON of the pinned rows) and the `ratesVerifiedAt` freshness range of its dated rows (oldest and newest, absent when no row is dated). The version string is a label the table author chose, and the arc held a price defect a label cannot expose: the hash is the content, so two tables sharing a version string but disagreeing on rates are distinguishable in any stored export, and two folds of one journal always derive the same hex. Computed at read time from the pinned bytes: the journal is unchanged and every existing pin gains the tail; invoice provenance and the CLI pass the segments through unchanged.
