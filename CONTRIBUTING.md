# Contributing to rulvar

The documentation set in `docs/` is the single source of truth for this
project (docs/README.md, section "Canon statement"). This file distills the
contributor workflow committed in docs/13-toolchain-repo.md, section
"Contributor workflow"; when the two disagree, docs/13 wins.

## Toolchain

- Node.js >= 22.12.0 (developed and released on Node 24).
- pnpm 11.x, pinned via the root `packageManager` field. With Corepack:
  `corepack enable pnpm` (or invoke `corepack pnpm ...` directly).
- One-time setup: `pnpm install --frozen-lockfile`.

Everyday commands, all from the repository root:

| Command             | What it does                                          |
| ------------------- | ----------------------------------------------------- |
| `pnpm build`        | Build all packages (Turborepo over tsdown)            |
| `pnpm typecheck`    | `tsc --noEmit` per package                            |
| `pnpm lint`         | ESLint per package (one root flat config)             |
| `pnpm format:check` | Prettier check (Prettier owns formatting)             |
| `pnpm test`         | One `vitest run` across every package project         |
| `pnpm pack-check`   | publint + attw on packed tarballs                     |
| `pnpm docs:lint`    | Docs conventions (hyphens, emojis, H1, install names) |
| `pnpm changeset`    | Add a changeset for a user-visible change             |

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
  PRs. Breaking changes carry a BREAKING section with a migration note
  (docs/12-release-versioning.md, section "Changelog format and migration
  notes").
- All packages release in lockstep at identical versions; the sole
  exemption is `@rulvar/compat`, which is independently versioned, is on
  the changesets ignore list, and releases only by a deliberate, manual
  version change when a KeyDeriver profile ages out of the support window
  (docs/12, section "Exemptions").

## The spec-first rule

A PR that changes normative behavior MUST include (or follow) the `docs/`
amendment; code never leads spec. Any deviation from a cited spec section
discovered during implementation is resolved by a docs amendment PR merged
before the deviating code lands (docs/README.md, section "Docs versioning
and amendment process").

## PR checks (all required)

Build, typecheck, lint, test matrix (Node 22.x/24.x), pack gates (publint,
@arethetypeswrong/cli), changeset presence, docs conventions, and a clean
or reviewed rolled-up `.d.ts` diff (`dts-rollup/` is regenerated in CI; a
dirty tree fails). Task-level test obligations apply per
docs/11-testing-strategy.md, section "What every task-level test must
cover"; changes in DEF-n areas MUST include or update the named defect
cassettes.

## Review gates

At least one approving review. PRs touching frozen fixtures, KeyDeriver
profiles, or (post-freeze) the six SPI seam `.d.ts` rollups require an
explicit second review and a pointer to the amending docs PR.

## Documentation contributions

Follow docs/README.md, section "Conventions": RFC 2119 keywords, ASCII
hyphen only (no em or en dashes), no emojis, exactly one H1 per file,
sentence-case headings. `pnpm docs:lint` checks the mechanical parts.

## License

License: TBD (decided before first public release; a 1.0 gate). Package
manifests carry the `UNLICENSED` placeholder until then; no file in this
repository contains license text. Vendored code under
`packages/core/src/vendor/` keeps its upstream MIT attribution in the
provenance headers.
