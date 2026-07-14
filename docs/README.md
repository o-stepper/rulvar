# Rulvar documentation site

This workspace builds the public documentation site published at <https://docs.rulvar.com>. The site is built with [VitePress](https://vitepress.dev), with API reference auto-generated from TypeScript by [TypeDoc](https://typedoc.org), Mermaid diagrams via [`vitepress-plugin-mermaid`](https://github.com/emersonbottero/vitepress-plugin-mermaid), and type-aware code samples via [Twoslash](https://shiki.style/packages/twoslash).

- **Project owner:** Oleksiy Stepurenko (<step.oleksiy@gmail.com>)
- **License:** [Apache-2.0](../LICENSE) - Copyright 2026 Oleksiy Stepurenko
- **Website:** <https://rulvar.com>
- **Repository:** <https://github.com/o-stepper/rulvar>

## Local development

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm --filter @rulvar/docs dev
```

The dev server starts at <http://localhost:5173>. Hot reload covers Markdown, Vue components, and the VitePress config.

To produce a production build (sync → TypeDoc → VitePress → `llms.txt`):

```bash
pnpm --filter @rulvar/docs build:site

# or, from the repo root, the convenience alias:
pnpm docs:build
```

The output is written to `.vitepress/dist`, a gitignored build directory; the deployed result is the site at <https://docs.rulvar.com>.

## Structure

```text
docs/
  .vitepress/        VitePress config + theme + sidebar/nav
  public/            static assets (logo, favicon, llms.txt, robots.txt)
  guide/             narrative documentation
  reference/         packages list, design principles, glossary, FAQ
  contributing/      mirrored project Markdown (CONTRIBUTING)
  api/               TypeDoc-generated API reference (committed; regenerated on build)
  scripts/           sync + changelog + llms.txt + helper scripts
```

The pre-2026-07 contents of this directory (the internal specification
set, `00-overview.md` through `14-open-questions.md`) were replaced by
this site and remain available in the git history.

## Deployment

The [`docs`](../.github/workflows/docs.yml) GitHub Actions workflow builds the site on every pull request and deploys to Cloudflare Pages on every push to `main`. The deploy job is gated on the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets - when they are not yet provisioned, the job emits a warning and exits cleanly.

## License

Distributed under the [Apache-2.0 License](../LICENSE). Copyright 2026 Oleksiy Stepurenko.
