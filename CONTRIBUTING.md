# Contributing to Rulvar

The public documentation site at [docs.rulvar.com](https://docs.rulvar.com)
is built from `docs/` in this repository. The internal specification set
that governed the initial build (`docs/00-overview.md` through
`docs/14-open-questions.md`) was retired into git history on 2026-07-12;
this file is the authoritative contributor workflow.

## Toolchain

- Node.js: two floors, deliberately different. The published packages
  declare `engines.node >= 22.12.0` (the first 22.x where `require(esm)`
  is flag-free), and a dedicated CI job runs the built suite on exactly
  that binary. The repository workspace itself needs Node >= 22.13.0,
  because the pinned pnpm 11.x refuses to start below that; development
  and releases run on Node 24. Development and CI cover Linux and macOS;
  Windows is untested.
- pnpm 11.x, pinned via the root `packageManager` field. Any modern pnpm
  (>= 10.9) invoked directly resolves the pin and switches to it by
  itself, so a differently versioned global pnpm is fine. With Corepack,
  run `corepack enable pnpm` ONCE and check that `command -v pnpm` now
  resolves to the shim; never invoke `corepack pnpm ...` directly
  against this repository. Turborepo spawns every package task as
  `pnpm run <task>` resolved from PATH, a Corepack-launched root exports
  `COREPACK_ROOT` to those children, and a PATH pnpm whose version
  differs from the pin then refuses to self-switch and fails every task
  with "This project is configured to use ... of pnpm. Your current pnpm
  is ..." - deterministically, on every run, not only on first
  bootstrap. The `bootstrap` CI job keeps both supported paths (direct
  pnpm, enabled Corepack shim) working and keeps this trap note honest.
- One-time setup: `pnpm install --frozen-lockfile`.

Everyday commands, all from the repository root:

| Command                  | What it does                                                |
| ------------------------ | ----------------------------------------------------------- |
| `pnpm build`             | Build all packages (Turborepo over tsdown)                  |
| `pnpm typecheck`         | `tsc --noEmit` per package                                  |
| `pnpm lint`              | ESLint per package (one root flat config)                   |
| `pnpm format:check`      | Prettier check (Prettier owns formatting)                   |
| `pnpm test`              | One `vitest run` across every package project               |
| `pnpm test:live`         | Key-gated live provider smokes (opt-in; SPENDS budget)      |
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
- Test matrix on Node 22.x and 24.x (a Node 26 job runs non-blocking),
  plus the exact runtime floor job: bootstrap on Node 24, then the full
  built suite on the exact Node 22.12.0 binary with
  `NODE_OPTIONS=--experimental-sqlite` (published packages promise that
  floor; the workspace toolchain itself needs >= 22.13.0).
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
- Pinned-pnpm bootstrap on Linux and macOS: with a stale global pnpm
  first on PATH, the direct-pnpm path and the enabled-Corepack path both
  run Turbo tasks on the pinned version, and un-enabled `corepack pnpm`
  keeps failing in Turbo children (if an upstream fix ever lands, the
  job turns red so the toolchain trap note gets updated).

Changes in DEF-n areas MUST include or update the named defect cassettes.
Scheduled and non-blocking: weekly live adapter contract tests (gated on
provider keys) open a `contract-drift` issue on provider drift; they never
block a PR and never rerecord fixtures automatically. The provider VCR
cassettes they re-send live under `cassettes/vcr/`; record or rerecord
them deliberately with `node scripts/record-provider-cassettes.mjs` (keys
from the environment; the script refuses to overwrite an existing
cassette, so a rerecord starts by deleting the file and shows as a
whole-file diff).

Live provider tests in the vitest suite are double-gated: they run only
when `RULVAR_LIVE_TESTS=1` AND the provider key is present
(`liveTestEnabled` in `@rulvar/testing`), so `pnpm test` stays hermetic
even in a shell that exports `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or
`GOOGLE_GENERATIVE_AI_API_KEY`. Opt in deliberately with
`pnpm test:live`: it reports which suites will fire for the keys it
finds, never prints key values, and SPENDS provider budget. Inside the
adapter smokes, a typed retryable provider error (429 rate limit, 529
overload) gets a bounded retry with backoff (`runLiveSmoke`); a
persistent or non-retryable failure fails the command with the typed
diagnostics intact.

Besides the CI-wired scripts, `scripts/` holds operator tooling that no
workflow invokes: the `record-m*-cassettes.mjs` family regenerates frozen
cassettes deliberately (guarded by the `hashVersion-bump` changeset token
and the fixtures lock), `contract-tests.mjs` backs the scheduled live
workflow, and `checkpoint-corpus.mjs` with `run-value-checkpoint.mjs` are
release-time value checkpoints run by hand. Treat them as production
scripts: they are versioned, reviewed, and referenced from the milestone
acceptance notes.

## Branch protection and the release token

`main` is protected by a repository ruleset: pull request required (zero
approvals, since a solo maintainer cannot approve their own PR), squash
only, no force push, no deletion, and the eight CI checks above required
to pass. Release tags (`v*`) are protected against deletion and
force-moves; creating them stays open, because the release workflow pushes
them.

There is deliberately **no bypass actor**. If a rule ever deadlocks
something, disabling the ruleset in Settings takes ten seconds and leaves
a visible, deliberate trace, which is the point.

Required checks and the release train interact in one non-obvious way, and
it is the reason the `RELEASE_PAT` secret exists. GitHub does not trigger
workflows for pushes made with `GITHUB_TOKEN`, so a Version Packages PR
opened by the changesets action under the default token arrives with **no
checks at all**: required status checks would then sit at `Expected`
forever and block every release. The action therefore authenticates with
`RELEASE_PAT` (a fine-grained token scoped to this repository, Contents
and Pull requests read/write), whose pushes look like a human's, so the
release PR gets ordinary CI.

The release workflow reads the token with a fallback:

```yaml
GITHUB_TOKEN: ${{ secrets.RELEASE_PAT || secrets.GITHUB_TOKEN }}
```

**When the PAT expires, nothing breaks**: the fallback degrades the train
to "publishes fine, but the Version Packages PR has no checks and must be
merged with the ruleset temporarily disabled". Mint a new token, update
the secret, and the checks come back. `Changeset presence` exempts the
release PR (its whole purpose is to consume the changesets) by reporting
success rather than skipping the job, because a skipped job is a
documented trap around required status checks.

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
