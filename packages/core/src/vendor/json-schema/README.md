# Vendored JSON Schema validator

- Upstream: `@cfworker/json-schema` version 4.1.1, files `src/*.ts`
- Repository: https://github.com/cfworker/cfworker (package `json-schema`)
- License: MIT (per the upstream package.json; canonical license text in the
  upstream repository)
- Vendored: 2026-07-06, task M0-T08

This directory is the sole vendored RUNTIME dependency of `@rulvar/core`
(docs/13-toolchain-repo.md, section "Dependency baseline pins"). It is an
eval-free, CSP-safe JSON Schema validator used for the supported subset
defined in docs/08-tools-permissions-spec.md, section "SchemaSpec":

- Supported: draft 2020-12 subset, local `$ref` (including `$defs`,
  `$anchor`, and root `#` recursion).
- Not supported by policy: `$dynamicRef` and remote `$ref`. Schemas using
  excluded features are rejected with a typed `ConfigError` at definition
  time by the SchemaSpec layer (lands in M1-T03); the vendored code itself is
  kept close to upstream and is not the enforcement point.

## Local edits (VENDOR-EDIT markers in the sources)

1. Every file: provenance header prepended.
2. `types.ts`: `const enum OutputFormat` rewritten as an erasable const
   object plus a type union (erasableSyntaxOnly forbids enums).
3. `validator.ts`: constructor parameter properties rewritten as explicit
   field declarations (erasableSyntaxOnly), and type-only imports split out
   (verbatimModuleSyntax).
4. `dereference.ts`, `validate.ts`: type-only imports split out
   (verbatimModuleSyntax).
5. `dereference.ts`: `initialBaseURI` no longer probes `self.location`
   (browser-only branch behind `@ts-ignore`); rulvar targets Node, so the
   binding is the upstream fallback URL and is `const`.

No behavioral change is intended by any edit. When updating the vendored
copy, re-apply these edits and update this README plus the version in every
provenance header.
