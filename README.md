# lurker

An embeddable TypeScript library for building multi-agent LLM workflows:
durable (a completed LLM call is never paid for twice), budget-bounded,
vendor-neutral, observable, and testable, with no server, no database, and
no control plane required.

Status: pre-release, under construction. Milestone M0 (repo bootstrap,
v0.1.0) of the implementation plan. The documentation set in
[docs/](docs/README.md) is the single source of truth; start with
[docs/00-overview.md](docs/00-overview.md).

## Packages

Fourteen packages under the `@lurker` scope, released in lockstep (the sole
exemption is `@lurker/compat`). The authoritative package map is
[docs/02-architecture.md](docs/02-architecture.md), section "Package map".
Install commands always reference `@lurker/<name>`; the unscoped npm name
is squatted by an unrelated 2014 package, and the umbrella currently
publishes as `@lurker/lurker`
([docs/13-toolchain-repo.md](docs/13-toolchain-repo.md), section "Naming
risk note").

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md). Requires Node >= 22.12.0 and
pnpm 11 (pinned via `packageManager`); `pnpm install`, then `pnpm build`,
`pnpm test`, `pnpm lint`.

## License

License: TBD, decided before the first public release
(docs/14-open-questions.md, OQ-23; a 1.0 release gate). Until then package
manifests carry the `UNLICENSED` placeholder and no file in this repository
contains license text.
