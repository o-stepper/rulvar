/**
 * The evidence source categories a contract can distribute over
 * (RV4908, the tenth comparison experiment): the task demanded
 * citations across implementation, tests, documentation, and examples,
 * the contract could say only `minEntries`, the specialists cited
 * documentation alone, and the judge took the points. The default
 * classifier reads the recorded file's path; a contract may replace it.
 */
export type EvidenceCategory = 'implementation' | 'tests' | 'docs' | 'examples';

/** The four categories, in the order every surface lists them. */
export const EVIDENCE_CATEGORIES: readonly EvidenceCategory[] = [
  'implementation',
  'tests',
  'docs',
  'examples',
];

/**
 * The default path classifier: a test file name (`.test.` or `.spec.`)
 * or a test directory segment is `tests`; an `examples` directory
 * segment is `examples`; a `docs` directory segment or a prose file
 * (markdown, restructured text, plain text) is `docs`; everything else
 * is `implementation`. Tests win over examples and docs (a test under
 * `examples/` is a test), examples win over docs (a markdown page under
 * `examples/` is an example). Deterministic from the path alone.
 */
export function classifyEvidenceFile(file: string): EvidenceCategory {
  const segments = file.replace(/\\/gu, '/').toLowerCase().split('/');
  const base = segments[segments.length - 1] ?? '';
  const directories = segments.slice(0, -1);
  if (
    /\.(?:test|spec)\.[a-z0-9]+$/u.test(base) ||
    directories.some(
      (segment) => segment === 'test' || segment === 'tests' || segment === '__tests__',
    )
  ) {
    return 'tests';
  }
  if (directories.some((segment) => segment === 'examples' || segment === 'example')) {
    return 'examples';
  }
  if (
    directories.some((segment) => segment === 'docs' || segment === 'doc') ||
    /\.(?:md|mdx|rst|txt)$/u.test(base)
  ) {
    return 'docs';
  }
  return 'implementation';
}
