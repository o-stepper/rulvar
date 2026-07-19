---
'@rulvar/planner': minor
---

`WorkerSandboxRunner` now launches its worker with an explicit `execArgv` (default `[]`) instead of inheriting the host's `process.execArgv`. Host-only launch flags used to reach the file-entry worker and kill a correct compiled workflow before its first sandbox operation: `--input-type=module` (present whenever the host itself runs as ESM from stdin or `--eval`) is rejected for file entries, and an inherited `--eval` carried the host's whole source text into the worker's options. The same compiled workflow now behaves identically whether the host runs from a file, from stdin, or via `--eval`. Hosts that need loader, coverage, or instrumentation flags inside the worker opt in through the new `WorkerSandboxRunnerOptions.execArgv`, which is passed to the worker verbatim.
