---
'@lurker/anthropic': minor
'@lurker/bridge-ai-sdk': minor
'@lurker/cli': minor
'@lurker/core': minor
'@lurker/evals': minor
'@lurker/lurker': minor
'@lurker/openai': minor
'@lurker/plan': minor
'@lurker/planner': minor
'@lurker/store-conformance': minor
'@lurker/store-sqlite': minor
'@lurker/testing': minor
'eslint-plugin-lurker': minor
---

M0 repo bootstrap (v0.1.0, docs/10-implementation-plan.md section "M0"):
monorepo scaffold on the committed toolchain (pnpm 11 workspaces with
catalogs, TypeScript 6.0, tsdown, Vitest 4, ESLint 9 flat config,
Turborepo 2, changesets fixed mode, npm trusted publishing), the docs/
canon as single source of truth, the L0 contracts skeleton in @lurker/core,
and the vendored dependencies (StandardSchemaV1/StandardJSONSchemaV1 types,
the @cfworker/json-schema lineage validator subset, a first-party monotonic
ULID). Placeholder scaffolds only: no public API ships in this release.
