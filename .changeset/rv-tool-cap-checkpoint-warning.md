---
'@rulvar/core': minor
---

The tool-cap-before-checkpoint preflight warning (the experiment review, recommendation P1.8). The runtime checkpoints once per COMPLETED tool turn, and nothing in the limits vocabulary bounds a parallel batch below the executed-call ceiling, so a worker on a parallel-tools model can consume its whole tool budget inside the first batch, before any checkpoint exists: a kill mid-batch re-pays every executed call on resume. `preflightEstimate` now emits the stable warning `tool-cap-before-checkpoint` for every declared spawn whose effective executed-call ceiling is finite and positive while the resolved model's caps report parallel tool support, with the exact ceiling named in the message. Serial models (one call per turn, a one-call loss window), uncapped spawns, and zero caps stay silent, and reports over such shapes are byte-identical to before.
