import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformerTwoslash } from '@shikijs/vitepress-twoslash';
import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';
import { nav } from './nav.js';
import { sidebar } from './sidebar.js';

const here = dirname(fileURLToPath(import.meta.url));

// The monorepo root package.json is a never-published 0.0.0 placeholder;
// the released fixed-group version lives on the umbrella package.
const umbrellaPkg = JSON.parse(
  readFileSync(resolve(here, '..', '..', 'packages', 'rulvar', 'package.json'), 'utf8'),
) as {
  version: string;
};

const VERSION = umbrellaPkg.version;
const SITE_URL = 'https://docs.rulvar.com';
const REPO_URL = 'https://github.com/o-stepper/rulvar';
const HOME_URL = 'https://rulvar.com';

const baseConfig = defineConfig({
  lang: 'en-US',
  title: 'rulvar',
  titleTemplate: ':title - rulvar',
  description:
    'An embeddable TypeScript engine for multi-agent LLM workflows - durable (a completed LLM call is never paid for twice), budget-bounded, vendor-neutral, observable, and testable. No server, no database, no control plane.',
  cleanUrls: true,
  lastUpdated: true,
  // The TypeDoc-generated tree links to per-package README anchors and
  // `_media/` artefacts that we deliberately omit (`readme: "none"` in
  // `typedoc.json`). Ignore dead links only inside `/api/**` plus the
  // relative forms TypeDoc emits; narrative pages still fail the build
  // on a real broken link.
  ignoreDeadLinks: [/^\/api\//, /_media\//, /\/README$/, /\/LICENSE$/, 'localhostLinks'],
  metaChunk: true,
  appearance: 'dark',
  srcDir: '.',
  srcExclude: ['README.md', 'node_modules/**'],
  outDir: '.vitepress/dist',
  cacheDir: '.vitepress/cache',

  head: [
    ['link', { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'author', content: 'Oleksiy Stepurenko' }],
    ['meta', { name: 'theme-color', content: '#0b62d6' }],
    ['meta', { name: 'color-scheme', content: 'dark' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'rulvar' }],
    ['meta', { property: 'og:url', content: SITE_URL }],
    ['meta', { property: 'og:title', content: 'rulvar documentation' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'An embeddable TypeScript engine for durable, budget-bounded, testable multi-agent LLM workflows.',
      },
    ],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'rulvar documentation' }],
    [
      'meta',
      {
        name: 'twitter:description',
        content:
          'An embeddable TypeScript engine for durable, budget-bounded, testable multi-agent LLM workflows. Apache-2.0. © 2026 Oleksiy Stepurenko.',
      },
    ],
  ],

  sitemap: {
    hostname: SITE_URL,
  },

  markdown: {
    theme: { light: 'github-light', dark: 'github-dark-dimmed' },
    lineNumbers: false,
    codeTransformers: [transformerTwoslash()],
    languages: ['ts', 'tsx', 'js', 'jsx', 'bash', 'json', 'yaml', 'md', 'mermaid'],
    image: { lazyLoading: true },
  },

  themeConfig: {
    siteTitle: 'rulvar',
    logo: { src: '/logo.svg', alt: 'rulvar' },

    nav,
    sidebar,

    socialLinks: [{ icon: 'github', link: REPO_URL, ariaLabel: 'GitHub repository' }],

    editLink: {
      pattern: `${REPO_URL}/edit/main/docs/:path`,
      text: 'Edit this page on GitHub',
    },

    search: {
      provider: 'local',
      options: {
        miniSearch: {
          searchOptions: {
            fuzzy: 0.2,
            prefix: true,
            boost: { title: 4, text: 2, titles: 1 },
          },
        },
        translations: {
          button: { buttonText: 'Search docs', buttonAriaLabel: 'Search docs' },
          modal: {
            displayDetails: 'Display detailed list',
            resetButtonTitle: 'Reset search',
            backButtonTitle: 'Close search',
            noResultsText: 'No results for',
            footer: {
              selectText: 'to select',
              navigateText: 'to navigate',
              closeText: 'to close',
            },
          },
        },
      },
    },

    outline: { level: [2, 3], label: 'On this page' },
    docFooter: { prev: 'Previous page', next: 'Next page' },

    footer: {
      message: `Released under the <a href="${REPO_URL}/blob/main/LICENSE">Apache-2.0 License</a>. rulvar · v${VERSION} · created and maintained by <a href="mailto:step.oleksiy@gmail.com">Oleksiy Stepurenko</a>.`,
      copyright: `© 2026 Oleksiy Stepurenko · <a href="${HOME_URL}">rulvar.com</a> · <a href="${REPO_URL}">github.com/o-stepper/rulvar</a>`,
    },
  },
});

export default withMermaid({
  ...baseConfig,
  vite: {
    resolve: {
      alias: {
        'vitepress-plugin-mermaid/Mermaid.vue': resolve(here, 'theme/components/DocsMermaid.vue'),
      },
    },
  },
  mermaid: {
    theme: 'dark',
    themeVariables: {
      primaryColor: '#1a1f2b',
      primaryTextColor: '#e6e9ef',
      primaryBorderColor: '#232a38',
      lineColor: '#6b7484',
      secondaryColor: '#151a24',
      tertiaryColor: '#0b0e14',
      mainBkg: '#151a24',
      nodeTextColor: '#e6e9ef',
      edgeLabelBackground: '#0b0e14',
    },
  },
  mermaidPlugin: {
    class: 'mermaid rulvar-mermaid',
  },
});
