# rulvar

An embeddable TypeScript library for building multi-agent LLM workflows:
durable (a completed LLM call is never paid for twice), budget-bounded,
vendor-neutral, observable, and testable, with no server, no database, and
no control plane required.

Official site: [rulvar.com](https://rulvar.com). The public documentation
lives at [docs.rulvar.com](https://docs.rulvar.com) and is built from
[docs/](docs/README.md); start with the
[quickstart](https://docs.rulvar.com/guide/quickstart). The internal
specification set that governed the initial build was retired into git
history on 2026-07-12 (it lived in `docs/` up to that date).

## Packages

Fourteen packages under the `@rulvar` scope, released in lockstep (the sole
exemption is `@rulvar/compat`). The package map with the dependency graph
is documented at
[docs.rulvar.com/reference/packages](https://docs.rulvar.com/reference/packages).
Install commands always reference `@rulvar/<name>`; the umbrella publishes
as `@rulvar/rulvar`.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md). Requires Node >= 22.12.0 and
pnpm 11 (pinned via `packageManager`); `pnpm install`, then `pnpm build`,
`pnpm test`, `pnpm lint`.

## License

[Apache-2.0](LICENSE) (the founder decision of 2026-07-11). Every published
package carries the LICENSE file; contributions are accepted under the DCO.
