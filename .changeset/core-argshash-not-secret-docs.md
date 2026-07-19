---
'@rulvar/core': patch
---

Correct the `RunMeta.argsHash` documentation (v1.24.0 review P2-2). The digest is a deterministic, unsalted SHA-256 over the JCS form of a run's genesis args, so it reveals when two runs shared identical args and low-entropy args (a boolean, an approval flag, a role, a short id) are recoverable by hashing candidate values. The TSDoc on `RunMeta.argsHash` and `hashRunArgs` no longer claims that nothing sensitive lands in meta; it now states the digest is sensitive-derived metadata that confers no confidentiality and must be access-controlled like the journal and transcripts. The raw args are still never journaled, and no runtime behavior changes.
