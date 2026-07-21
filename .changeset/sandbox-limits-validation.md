---
'@rulvar/planner': minor
---

Validate `WorkerSandboxRunner` resource ceilings at construction (v1.34.0 review P2-2, P2-3). `timeoutMs` must be an integer between 1 and 2147483647 ms, the Node timer maximum: a larger value used to clamp to a 1 ms timer and kill a trivial worker immediately with `sandbox_limit`. `memoryMb` must be a positive integer. Anything else, NaN included, is a typed `ConfigError` before any worker exists.
