# rulvar

An embeddable TypeScript library for building multi-agent LLM workflows:
durable (a completed LLM call is never paid for twice), budget-bounded,
vendor-neutral, observable, and testable, with no server, no database, and
no control plane required.

Official site: [rulvar.com](https://rulvar.com). The documentation set in
[docs/](docs/README.md) is the single source of truth; start with
[docs/00-overview.md](docs/00-overview.md).

## Packages

Fourteen packages under the `@rulvar` scope, released in lockstep (the sole
exemption is `@rulvar/compat`). The authoritative package map is
[docs/02-architecture.md](docs/02-architecture.md), section "Package map".
Install commands always reference `@rulvar/<name>`; the umbrella publishes
as `@rulvar/rulvar`
([docs/13-toolchain-repo.md](docs/13-toolchain-repo.md), section "Naming
note").

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md). Requires Node >= 22.12.0 and
pnpm 11 (pinned via `packageManager`); `pnpm install`, then `pnpm build`,
`pnpm test`, `pnpm lint`.

## License

License: TBD, decided before the first public release
(docs/14-open-questions.md, OQ-23; a 1.0 release gate). Until then package
manifests carry the `UNLICENSED` placeholder and no file in this repository
contains license text.
