---
'@rulvar/core': minor
---

Contain `FileTranscriptStore` refs under their configured root (v1.36.0 review SEC-P1). The per-segment check accepted `.` and `..` (dots are in its alphabet), so `join` let a `..` segment escape: a caller passing an untrusted ref to `put`, `get`, `list`, or `delete`, or an untrusted `runId` (which prefixes the checkpoint and workflow source refs), could read, write, or delete `.bin` files outside the directory. Every segment now must be a nonempty safe token that is neither `.` nor `..`, and the resolved path must stay under the resolved root. The engine also refuses an unsafe `runId` with a typed `ConfigError` before its first store write, so a compiled run cannot persist its source outside the transcript root.
