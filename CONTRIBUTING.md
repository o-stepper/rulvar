# Contributing to rulvar

The public documentation site at [docs.rulvar.com](https://docs.rulvar.com)
is built from `docs/` in this repository. The internal specification set
that governed the initial build (`docs/00-overview.md` through
`docs/14-open-questions.md`) was retired into git history on 2026-07-12;
this file is the authoritative contributor workflow.

## Toolchain

- Node.js >= 22.12.0 (developed and released on Node 24).
- pnpm 11.x, pinned via the root `packageManager` field. With Corepack:
  `corepack enable pnpm` (or invoke `corepack pnpm ...` directly).
- One-time setup: `pnpm install --frozen-lockfile`.

Everyday commands, all from the repository root:

| Command                  | What it does                                                |
| ------------------------ | ----------------------------------------------------------- |
| `pnpm build`             | Build all packages (Turborepo over tsdown)                  |
| `pnpm typecheck`         | `tsc --noEmit` per package                                  |
| `pnpm lint`              | ESLint per package (one root flat config)                   |
| `pnpm format:check`      | Prettier check (Prettier owns formatting)                   |
| `pnpm test`              | One `vitest run` across every package project               |
| `pnpm pack-check`        | publint + attw on packed tarballs                           |
| `pnpm dts:baseline`      | Regenerate the rolled-up `.d.ts` baselines in `dts-rollup/` |
| `pnpm check:fixed-group` | Changesets fixed group matches the workspace                |
| `pnpm docs:lint`         | Docs conventions (hyphens, emojis, H1, install names)       |
| `pnpm docs:dev`          | Documentation site dev server (VitePress)                   |
| `pnpm docs:build`        | Full documentation site build (TypeDoc + VitePress)         |
| `pnpm changeset`         | Add a changeset for a user-visible change                   |

## Branching and commits

- Trunk-based development: short-lived feature branches off `main`, merged
  by PR; no long-lived release branches pre-1.0. Squash-merge policy.
- Branch names reference the task ID where one exists, for example
  `m2-t04-ref-entries`.
- Commit subjects: imperative, at most 72 characters. Bodies cite the IDs
  the change implements or amends (Mx-Tyy, FR-xxx, DEF-n, OQ-nn).
  Conventional-commits prefixes are not required: changesets, not commit
  messages, drive versioning.

## Changesets

- Every user-visible change carries a changeset; CI enforces presence on
  PRs. Breaking changes carry a BREAKING section with a migration note.
- All packages release in lockstep at identical versions; the sole
  exemption is `@rulvar/compat`, which is independently versioned, is on
  the changesets ignore list, and releases only by a deliberate, manual
  version change when a KeyDeriver profile ages out of the support window.
  See [docs.rulvar.com/reference/versioning](https://docs.rulvar.com/reference/versioning).

## The docs-first rule

A PR that changes normative public behavior MUST include (or follow) the
matching documentation change under `docs/`; code never leads
documentation. Behavior that the site documents is treated as contract:
a deviation discovered during implementation is resolved by a docs PR
merged before the deviating code lands.

## PR checks (all required)

- Build, typecheck, lint, and the Prettier check on Node 24.
- Test matrix on Node 22.x and 24.x (a Node 26 job runs non-blocking).
- The complete defect cassette catalog replay-strict in one job, with
  zero live calls; `scripts/catalog-audit.mjs` first asserts every ID in
  `cassettes/CATALOG.md` (the normative catalog) resolves to a fixture or
  a named suite.
- Pack gates: publint and @arethetypeswrong/cli on packed tarballs, plus
  the umbrella install smoke test.
- Changeset presence, the changesets fixed-group check, and frozen-fixture
  write protection.
- Rolled-up `.d.ts` drift gate: `dts-rollup/` is regenerated in CI and a
  dirty tree fails; run `pnpm dts:baseline` after a public API change and
  commit the result.
- Docs conventions (`pnpm docs:lint`) over `docs/` plus the root README
  and this file.
- Docs site build with the generated-docs freshness gate (committed
  `docs/api`, the aggregated changelog, and the synced contributing page
  must be regenerated in the same PR) and the offline link check.

Changes in DEF-n areas MUST include or update the named defect cassettes.
Scheduled and non-blocking: weekly live adapter contract tests (gated on
provider keys) open a `contract-drift` issue on provider drift; they never
block a PR and never rerecord fixtures automatically.

## Review gates

At least one approving review. PRs touching frozen fixtures, KeyDeriver
profiles, or (post-freeze) the seven SPI seam `.d.ts` rollups require an
explicit second review and a pointer to the amending docs PR.

## Documentation contributions

The site sources live under `docs/` (VitePress). Conventions, enforced by
`pnpm docs:lint`: ASCII hyphen only (no em or en dashes), no emojis,
exactly one H1 per page (home-layout pages carry their heading in
frontmatter), and install commands that always use `@rulvar/<name>`.
Headings use sentence case by convention; the linter does not check
that. The TypeDoc output under `docs/api/`, the
aggregated changelog, and the synced contributing page are generated;
regenerate them with `pnpm docs:build` and commit the result.

## License

The project is licensed under [Apache-2.0](LICENSE) (the founder decision
of 2026-07-11). Contributions are accepted under the Developer Certificate
of Origin: sign your commits off (`git commit -s`), which certifies you
have the right to submit the work under the project license; copyright of
the project remains with its owner. Vendored code under
`packages/core/src/vendor/` keeps its upstream MIT attribution in the
provenance headers.
