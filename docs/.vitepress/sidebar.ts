import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DefaultTheme } from 'vitepress';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * The narrative `/guide/` sidebar - one entry per public-facing topic.
 *
 * Sourced from the public surface of the engine: the rolled-up public
 * API (`dts-rollup/`), package manifests, the examples workspace, and
 * the project README.
 */
const guideSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: 'Introduction',
    collapsed: false,
    items: [
      { text: 'What is Rulvar?', link: '/guide/' },
      { text: 'Installation', link: '/guide/installation' },
      { text: 'Quickstart', link: '/guide/quickstart' },
      { text: 'Architecture', link: '/guide/architecture' },
      { text: 'Core invariants', link: '/guide/invariants' },
      { text: 'Rulvar for LLMs', link: '/guide/llms' },
    ],
  },
  {
    text: 'Core concepts',
    collapsed: false,
    items: [
      { text: 'The journal', link: '/guide/journal' },
      { text: 'Workflows and ctx', link: '/guide/workflows' },
      { text: 'Agents', link: '/guide/agents' },
      { text: 'Orchestration modes', link: '/guide/orchestration-modes' },
      { text: 'Budgets and termination', link: '/guide/budgets' },
      { text: 'Durability and resume', link: '/guide/durability' },
    ],
  },
  {
    text: 'Models and providers',
    collapsed: false,
    items: [
      { text: 'Providers', link: '/guide/providers' },
      { text: 'Model routing', link: '/guide/model-routing' },
      { text: 'ModelKnowledge', link: '/guide/model-knowledge' },
    ],
  },
  {
    text: 'Adaptive orchestration',
    collapsed: false,
    items: [
      { text: 'PlanRunner and extensions', link: '/guide/adaptive-orchestration' },
      { text: 'Machine-written scripts', link: '/guide/planner' },
      { text: 'Determinism lint', link: '/guide/determinism' },
    ],
  },
  {
    text: 'Tools',
    collapsed: false,
    items: [
      { text: 'Tools and permissions', link: '/guide/tools' },
      { text: 'MCP', link: '/guide/mcp' },
      { text: 'Isolated executor', link: '/guide/isolated-executor' },
    ],
  },
  {
    text: 'Storage',
    collapsed: false,
    items: [
      { text: 'Stores', link: '/guide/stores' },
      { text: 'Data protection', link: '/guide/data-protection' },
      { text: 'Journal compatibility', link: '/guide/journal-compatibility' },
    ],
  },
  {
    text: 'Operations',
    collapsed: false,
    items: [
      { text: 'Observability', link: '/guide/observability' },
      { text: 'Testing', link: '/guide/testing' },
      { text: 'Evals', link: '/guide/evals' },
      { text: 'CLI, server, and worker', link: '/guide/cli' },
      { text: 'Troubleshooting', link: '/guide/troubleshooting' },
    ],
  },
  {
    text: 'Extending Rulvar',
    collapsed: false,
    items: [
      { text: 'Writing a provider adapter', link: '/guide/adapter-authors' },
      { text: 'Writing a store', link: '/guide/store-authors' },
    ],
  },
  {
    text: 'Examples',
    collapsed: false,
    items: [
      { text: 'Example patterns', link: '/guide/examples' },
      { text: 'Cookbook', link: '/guide/cookbook' },
    ],
  },
];

const referenceSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: 'Reference',
    collapsed: false,
    items: [
      { text: 'Packages', link: '/reference/packages' },
      { text: 'Design principles', link: '/reference/design-principles' },
      { text: 'Glossary', link: '/reference/glossary' },
      { text: 'Versioning and releases', link: '/reference/versioning' },
      { text: 'Changelog', link: '/reference/changelog' },
      { text: 'FAQ', link: '/reference/faq' },
      { text: 'Troubleshooting', link: '/guide/troubleshooting' },
    ],
  },
];

const contributingSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: 'Contributing',
    collapsed: false,
    items: [
      { text: 'Contributing guide', link: '/contributing/' },
      { text: 'RFC: fenced run state', link: '/contributing/rfc-fenced-run-state' },
    ],
  },
];

/**
 * Builds the path-keyed API sidebars from the TypeDoc-generated
 * `api/typedoc-sidebar.json` (emitted by `typedoc-vitepress-theme` on
 * every `pnpm build:typedoc` run).
 *
 * One monolithic `/api/` sidebar used to be served to every generated
 * page, and VitePress renders the whole sidebar tree into each page's
 * HTML: about 1 570 nodes, roughly 540 KB of markup, repeated across
 * about 1 500 pages, which was 97 percent of an 851 MB build (v1.22.0
 * review P3-6). The tree is now sliced by longest-prefix path keys, so
 * a page embeds only what its context needs:
 *
 * - `/api/` (the landing page): the package list, one link each.
 * - `/api/<package>/` (a package index): that package's full tree.
 * - `/api/<package>/<category>/` (a symbol page): the package header
 *   plus ONLY its own category's subtree.
 *
 * URLs are untouched; navigation across categories goes through the
 * package index and breadcrumbs, exactly like navigation across
 * packages always has.
 */
function buildApiSidebars(): Record<string, DefaultTheme.SidebarItem[]> {
  const sidebarPath = resolve(here, '..', 'api', 'typedoc-sidebar.json');
  if (!existsSync(sidebarPath)) {
    return {
      '/api/': [
        {
          text: 'API reference',
          collapsed: false,
          items: [{ text: 'Run `pnpm build:typedoc` to generate', link: '/api/' }],
        },
      ],
    };
  }
  try {
    const raw = readFileSync(sidebarPath, 'utf8');
    const parsed = JSON.parse(raw) as DefaultTheme.SidebarItem[];
    const map: Record<string, DefaultTheme.SidebarItem[]> = {
      '/api/': [
        {
          text: 'API reference',
          collapsed: false,
          items: parsed.map((pkg) => ({
            ...(pkg.text === undefined ? {} : { text: pkg.text }),
            ...(pkg.link === undefined ? {} : { link: pkg.link }),
          })),
        },
      ],
    };
    for (const pkg of parsed) {
      if (typeof pkg.link !== 'string') {
        continue;
      }
      const pkgKey = pkg.link.endsWith('/') ? pkg.link : `${pkg.link}/`;
      map[pkgKey] = [{ ...pkg, collapsed: false }];
      for (const category of pkg.items ?? []) {
        const firstChildLink = category.items?.find(
          (item) => typeof item.link === 'string',
        )?.link;
        if (typeof firstChildLink !== 'string') {
          continue;
        }
        // '/api/@rulvar/core/classes/Replayer.md' -> '/api/@rulvar/core/classes/'
        const categoryKey = firstChildLink.slice(0, firstChildLink.lastIndexOf('/') + 1);
        if (!categoryKey.startsWith(pkgKey) || categoryKey === pkgKey) {
          continue;
        }
        map[categoryKey] = [
          {
            ...(pkg.text === undefined ? {} : { text: pkg.text }),
            link: pkg.link,
            collapsed: false,
            items: [{ ...category, collapsed: false }],
          },
        ];
      }
    }
    return map;
  } catch (err) {
    console.warn(
      '[rulvar/docs] Failed to read typedoc-sidebar.json:',
      err instanceof Error ? err.message : err,
    );
    return {};
  }
}

export const sidebar: DefaultTheme.Sidebar = {
  '/guide/': guideSidebar,
  '/reference/': referenceSidebar,
  '/contributing/': contributingSidebar,
  ...buildApiSidebars(),
};
