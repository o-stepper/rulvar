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
    ],
  },
  {
    text: 'Storage',
    collapsed: false,
    items: [
      { text: 'Stores', link: '/guide/stores' },
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
    items: [{ text: 'Example patterns', link: '/guide/examples' }],
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
    items: [{ text: 'Contributing guide', link: '/contributing/' }],
  },
];

/**
 * Reads the TypeDoc-generated sidebar (when present) and returns a
 * VitePress sidebar block. The file is emitted by `typedoc-vitepress-theme`
 * into `api/typedoc-sidebar.json` on every `pnpm build:typedoc` run.
 *
 * Returns an empty list when the API has not been generated yet (e.g.
 * during `pnpm dev` before the first TypeDoc run).
 */
function loadTypedocSidebar(): DefaultTheme.SidebarItem[] {
  const sidebarPath = resolve(here, '..', 'api', 'typedoc-sidebar.json');
  if (!existsSync(sidebarPath)) {
    return [
      {
        text: 'API reference',
        collapsed: false,
        items: [
          {
            text: 'Run `pnpm build:typedoc` to generate',
            link: '/api/',
          },
        ],
      },
    ];
  }
  try {
    const raw = readFileSync(sidebarPath, 'utf8');
    const parsed = JSON.parse(raw) as DefaultTheme.SidebarItem[];
    return [
      {
        text: 'API reference',
        collapsed: false,
        items: parsed,
      },
    ];
  } catch (err) {
    console.warn(
      '[rulvar/docs] Failed to read typedoc-sidebar.json:',
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

export const sidebar: DefaultTheme.Sidebar = {
  '/guide/': guideSidebar,
  '/reference/': referenceSidebar,
  '/contributing/': contributingSidebar,
  '/api/': loadTypedocSidebar(),
};
