# @lurker/anthropic

## 0.3.0

### Patch Changes

- Updated dependencies [43444f6]
- Updated dependencies [279881b]
- Updated dependencies [9fd0966]
- Updated dependencies [24ebadf]
- Updated dependencies [a1b35d3]
- Updated dependencies [18a5821]
  - @lurker/core@0.3.0

## 0.2.0

### Minor Changes

- 527c9b4: M1-T12/T13: the two first-class adapters on the July 2026 surfaces.
  @lurker/anthropic: adaptive thinking, the output_config umbrella (effort
  passthrough including max, native json_schema format), strict tools,
  cache_control compilation from cacheHint (deepest-4 kept), thinking-block
  retention with provider-granularity projection, pause_turn absorption
  without synthetic user messages, the full stop-reason table with typed
  refusal stop details, count_tokens, capabilities-bearing refreshCaps,
  retry-after/x-ratelimit/529 signaling, SDK autoretries disabled, usage
  normalization under the Usage invariant. @lurker/openai: Responses API
  with manual item replay only (store false, encrypted reasoning echoed
  verbatim; previous_response_id/Conversations rejected as ConfigError),
  flattened strict function tools, text.format json_schema, the typed SSE
  catalog mapped to ChatEvent, the Chat Completions degraded path (visible
  via providerMetadata), effort mapping with the documented lossy
  max-to-xhigh downmap and provider none via providerOptions only, usage
  normalization.

### Patch Changes

- Updated dependencies [c24228d]
- Updated dependencies [c50871e]
- Updated dependencies [1af8fb9]
- Updated dependencies [1fe0249]
- Updated dependencies [5c4fc32]
  - @lurker/core@0.2.0

## 0.1.0

### Minor Changes

- f4e2be9: M0 repo bootstrap (v0.1.0, docs/10-implementation-plan.md section "M0"):
  monorepo scaffold on the committed toolchain (pnpm 11 workspaces with
  catalogs, TypeScript 6.0, tsdown, Vitest 4, ESLint 9 flat config,
  Turborepo 2, changesets fixed mode, npm trusted publishing), the docs/
  canon as single source of truth, the L0 contracts skeleton in @lurker/core,
  and the vendored dependencies (StandardSchemaV1/StandardJSONSchemaV1 types,
  the @cfworker/json-schema lineage validator subset, a first-party monotonic
  ULID). Placeholder scaffolds only: no public API ships in this release.

### Patch Changes

- Updated dependencies [f4e2be9]
  - @lurker/core@0.1.0
