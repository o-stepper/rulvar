# @rulvar/executor

## 1.75.1

### Patch Changes

- Updated dependencies [82bc0f0]
  - @rulvar/core@1.75.1

## 1.75.0

### Patch Changes

- Updated dependencies [c486de8]
  - @rulvar/core@1.75.0

## 1.74.0

### Patch Changes

- Updated dependencies [d94beab]
  - @rulvar/core@1.74.0

## 1.73.0

### Patch Changes

- Updated dependencies [3e95bd1]
  - @rulvar/core@1.73.0

## 1.72.0

### Patch Changes

- Updated dependencies [662e9e0]
  - @rulvar/core@1.72.0

## 1.71.0

### Patch Changes

- Updated dependencies [20d02e0]
  - @rulvar/core@1.71.0

## 1.70.1

### Patch Changes

- @rulvar/core@1.70.1

## 1.70.0

### Patch Changes

- @rulvar/core@1.70.0

## 1.69.0

### Patch Changes

- Updated dependencies [b21a681]
  - @rulvar/core@1.69.0

## 1.68.0

### Patch Changes

- Updated dependencies [b227874]
  - @rulvar/core@1.68.0

## 1.67.0

### Patch Changes

- Updated dependencies [8e6006d]
  - @rulvar/core@1.67.0

## 1.66.0

### Patch Changes

- Updated dependencies [1b8987e]
  - @rulvar/core@1.66.0

## 1.65.0

### Patch Changes

- Updated dependencies [0b6b859]
  - @rulvar/core@1.65.0

## 1.64.0

### Patch Changes

- Updated dependencies [991f9b5]
  - @rulvar/core@1.64.0

## 1.63.0

### Patch Changes

- Updated dependencies [8a28aed]
  - @rulvar/core@1.63.0

## 1.62.0

### Patch Changes

- Updated dependencies [fca5fd1]
  - @rulvar/core@1.62.0

## 1.61.0

### Patch Changes

- Updated dependencies [b4c1f1f]
  - @rulvar/core@1.61.0

## 1.60.0

### Patch Changes

- Updated dependencies [59bbeaa]
  - @rulvar/core@1.60.0

## 1.59.4

### Patch Changes

- Updated dependencies [c49d7a1]
  - @rulvar/core@1.59.4

## 1.59.3

### Patch Changes

- Updated dependencies [deaef36]
  - @rulvar/core@1.59.3

## 1.59.2

### Patch Changes

- Updated dependencies [dd0e10f]
  - @rulvar/core@1.59.2

## 1.59.1

### Patch Changes

- Updated dependencies [c127770]
  - @rulvar/core@1.59.1

## 1.59.0

### Minor Changes

- 615dc90: RV-216: the isolated tool executor, the last open item in the improvement plan. In-process tools are ordinary function calls with full host capabilities (an execution convenience, never a sandbox for hostile or model-generated code); this release adds an official out-of-process executor contract so a tool whose input is untrusted cannot reach host capabilities. (1) THE SEAM in `@rulvar/core`: a `ToolExecutorProvider` SPI, registered on the engine as `createEngine({ executors: { subprocess, container } })`. A tool declaring `executor: 'subprocess'` or `'container'` (previously a hard "only inprocess in v1" rejection) dispatches through the matching provider instead of running its `execute` closure; an unregistered tag is a typed ConfigError at spawn time, before any provider or model call. The dispatch mints the tool span exactly like an inprocess call and derives a stable idempotency key (a pure function of runId, tool name, and canonical args) so a side-effecting tool can fold an at-least-once retry into effectively-once; the tag never enters `toolsetHash`, so opting a tool into isolation does not change run identity, and inprocess dispatch stays byte-identical. (2) THE REFERENCE ADAPTERS in the new `@rulvar/executor` package: `subprocessExecutor` runs the tool in a child process with a REPLACED environment (host credentials scrubbed; the usual exfiltration path removed), a fresh ephemeral working directory per call, per-call short-lived credentials, a hard timeout that escalates SIGTERM to SIGKILL, and a bounded output capture, plus a `sandbox` launcher hook where bwrap/firejail/sandbox-exec plug in for filesystem and network isolation; `containerExecutor` runs it in a one-shot container with the network dropped (`--network none`), the root filesystem read-only, memory/CPU/pid caps, and all Linux capabilities dropped, which is where the strong isolation the subprocess adapter cannot promise on its own actually holds (a microVM adapter implements the same seam). `subprocessTool` defines a tool that dispatches through them; a `ToolEffectLedger` records every dispatch (idempotency key, tool, argsHash, workdir, outcome) so a host can bind an approval to the effect it authorized. (3) THE CONFORMANCE KIT: `executorConformance` is the executable shared-contract battery any command-based executor must pass, foremost the gate the epic exists for, a hostile tool cannot read the host's ambient credentials; the subprocess reference passes all of it, and the container reference additionally proves the network and filesystem isolation against a real runtime. New guide page: https://docs.rulvar.com/guide/isolated-executor.

### Patch Changes

- Updated dependencies [615dc90]
  - @rulvar/core@1.59.0
