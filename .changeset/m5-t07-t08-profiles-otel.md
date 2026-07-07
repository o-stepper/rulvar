---
'@lurker/core': minor
'@lurker/cli': minor
---

M5-T07 RunProfile presets and M5-T08 OTel exporter.

- `engine/run-profiles.ts`: `RUN_PROFILES` (fast/standard/deep/ultra) and
  `runProfile(name)` ship the presets as pure DATA, bundles of per-role
  effort hints, per-run concurrency, budget, permission preset, and
  spawn limits, with no functions and no named model strings (named
  strong defaults stay in the umbrella). They are never engine
  semantics: a source-scan test asserts the engine has zero branches
  keyed on profile names. `lurker run --profile <name>` applies the
  chosen profile UNDER the host's own engine options (host always wins;
  the engine then sees only ordinary options), compiling the profile's
  permission preset into the engine deny/ask layers as data.
- `@lurker/cli` gains `toOtel(run, tracer)`: it maps a settled run's
  spanId tree 1:1 onto OpenTelemetry spans (run > phase > agent > tool >
  child), with lurker.* and gen_ai.* attributes, start/end timestamps
  from the lifecycle events, and payload-only events attached as span
  events. Prompts, completions, and tool payloads are NEVER exported;
  replayed events never create duplicate spans. `@opentelemetry/api`
  ^1.9 is an optional peer dependency and the exporter is typed against
  a minimal structural TracerLike, so an absent OTel package never
  breaks the CLI.
