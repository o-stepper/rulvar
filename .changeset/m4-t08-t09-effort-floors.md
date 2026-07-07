---
'@lurker/core': minor
'@lurker/lurker': minor
'@lurker/testing': minor
---

M4-T08 canonical effort completion and M4-T09 role quality floors.

- Effort semantics are complete: the role effort defaults and the
  per-adapter mapping tables (Anthropic passthrough including max,
  OpenAI max downmapped to xhigh and recorded in providerMetadata,
  provider none only via namespaced providerOptions) shipped earlier
  milestones; this change completes VISIBLE scrubbing everywhere it was
  still silent: the summarize invocation surfaces its scrubs at fire
  time and a failover takeover surfaces the fallback's scrubs the
  moment it starts serving. Scrubbed effort is never mapped into
  max_tokens.
- The effort-defaults-shift cassette is now RECORDED through the live
  runtime (docs/10 M4 gating row): the frozen v1 prefix, closed offline
  the way an operator would, resumes live under explicit high effort
  with the completed semantics; every v1 entry matches and the one new
  spawn carries canonical effort in v2 identity. The recorder output is
  pinned byte-for-byte by the frozen-drift suite and the fixture lock
  now covers 18 files.
- Quality floors (`model/floors.ts`, M4-T09): per-role and
  per-declared-taskClass allow/deny lists supplied via
  `createEngine({ floors })`, enforced INSIDE the router at resolution,
  before any live call and before any journal entry, for every
  invocation the chain produces (primaries, failover fallbacks, and the
  summarize fallback alike). `AgentProfile.taskClass` declares the
  class; unclassified profiles see only byRole floors. A violation is a
  typed ConfigError.
- The umbrella `lurker` package now ships floors opinions next to its
  strong routing defaults: `recommendedDefaults.floors` pins orchestrate
  and plan to strong named models. The core itself ships no named model
  strings, and the umbrella suite enforces that with a source scan.
