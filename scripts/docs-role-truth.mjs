// The invocation-role prose is GENERATED from the exported contract
// (RV2511, the 1.226.0 comparison review). `InvocationRole` has carried
// seven members since the synthesis invocation shipped, and the docs
// disagreed with THEMSELVES about it: the model-routing guide and the
// agents guide said seven, while the architecture guide and the design
// principles said six and listed six, dropping `synthesize`. That prose
// is also what the llms-full.txt bundle ships, so the machine-readable
// surface carried the wrong contract. Hand-maintained prose about a
// closed union drifts the moment the union grows; this gate makes the
// union the only author.
//
// Usage:
//   node scripts/docs-role-truth.mjs            check (a CI gate)
//   node scripts/docs-role-truth.mjs --write    rewrite from the union
//
// The markers follow the version-pin idiom already in these docs:
//   <!-- roles:count -->seven<!-- /roles -->
//   <!-- roles:list -->`orchestrate`, `plan`, ...<!-- /roles -->
//
// Run with: pnpm docs:roles (and pnpm test:scripts for the tests).
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const sourcePath = join(repoRoot, 'packages/core/src/l0/messages.ts');
const docsRoots = [join(repoRoot, 'docs/guide'), join(repoRoot, 'docs/reference')];
/**
 * The changelog is a HISTORICAL record generated from changesets: its
 * entries describe the contract of the release they announce, and
 * rewriting them to today's union would falsify the record. Every other
 * page states the CURRENT contract and is fair game.
 */
const EXCLUDED = new Set([join(repoRoot, 'docs/reference/changelog.md')]);

/** Spelled-out counts, so the prose reads as prose. */
export const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
];

const MARKED = /<!-- roles:(count|list) -->([\s\S]*?)<!-- \/roles -->/gu;
// A count word in front of "invocation roles" that no marker owns: the
// next role added would leave this one stale and silent. The optional
// bracket catches the markdown-link form the agents guide uses.
const UNMARKED_COUNT = new RegExp(
  `(?<!-->)\\b(${NUMBER_WORDS.join('|')}|\\d+)\\s+\\[?invocation roles\\b`,
  'giu',
);
/** The same shape in halves, so a frontmatter count can be rewritten. */
const COUNT_IN_PROSE = new RegExp(
  `\\b(${NUMBER_WORDS.join('|')}|\\d+)(\\s+\\[?invocation roles\\b)`,
  'giu',
);

/**
 * The exported union, in DECLARATION order: the generated list reads
 * the way the type reads, so a reviewer can diff prose against source
 * by eye. Parsed from the SOURCE rather than the built dts, so the gate
 * runs before a build and cannot be fooled by a stale artifact.
 */
export function parseInvocationRoles(source) {
  const declaration = /export type InvocationRole =([^;]+);/u.exec(source);
  if (declaration === null) {
    throw new Error('InvocationRole not found; the declaration shape changed');
  }
  const roles = [...declaration[1].matchAll(/'([a-z][a-zA-Z0-9_-]*)'/gu)].map((match) => match[1]);
  if (roles.length === 0) {
    throw new Error('InvocationRole parsed to an empty union; the declaration shape changed');
  }
  return roles;
}

/**
 * Judges one page against the union. Returns the rewritten text and the
 * failures found; with `write` false the text comes back untouched and
 * every divergence is a failure instead.
 */
export function applyRoleTruth(original, { roles, write = false, where = 'the page' } = {}) {
  const countWord = NUMBER_WORDS[roles.length] ?? String(roles.length);
  const listText = roles.map((role) => `\`${role}\``).join(', ');
  const failures = [];
  // The YAML frontmatter cannot carry HTML comments, so a count word in
  // a page `description` is checked and rewritten in place instead of
  // being wrapped: the gate still owns it, the YAML stays valid.
  const frontmatter = /^---\n[\s\S]*?\n---\n/u.exec(original)?.[0] ?? '';
  const withFrontmatter =
    frontmatter === ''
      ? original
      : frontmatter.replace(COUNT_IN_PROSE, (whole, word, tail) => {
          if (word.toLowerCase() === countWord) {
            return whole;
          }
          if (!write) {
            failures.push(
              `${where}: the frontmatter says "${word} invocation roles"; the exported ` +
                `InvocationRole says ${countWord}`,
            );
            return whole;
          }
          return `${countWord}${tail}`;
        }) + original.slice(frontmatter.length);
  const updated = withFrontmatter.replace(MARKED, (whole, kind, body) => {
    const expected = kind === 'count' ? countWord : listText;
    if (body === expected) {
      return whole;
    }
    if (!write) {
      failures.push(
        `${where}: roles:${kind} reads ${JSON.stringify(body)}; the exported ` +
          `InvocationRole says ${JSON.stringify(expected)}`,
      );
      return whole;
    }
    return `<!-- roles:${kind} -->${expected}<!-- /roles -->`;
  });
  const body = frontmatter === '' ? updated : updated.slice(frontmatter.length);
  for (const match of body.matchAll(UNMARKED_COUNT)) {
    failures.push(
      `${where}: "${match[0]}" counts the roles in prose no marker owns; wrap the count ` +
        `in <!-- roles:count -->...<!-- /roles --> so this gate keeps it true`,
    );
  }
  return { updated, failures };
}

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? markdownFiles(path) : path.endsWith('.md') ? [path] : [];
    }),
  );
  return nested.flat();
}

export async function main(argv = process.argv) {
  const write = argv.includes('--write');
  const roles = parseInvocationRoles(await readFile(sourcePath, 'utf8'));
  const countWord = NUMBER_WORDS[roles.length] ?? String(roles.length);
  const listText = roles.map((role) => `\`${role}\``).join(', ');
  const failures = [];
  const rewritten = [];
  for (const root of docsRoots) {
    for (const file of await markdownFiles(root)) {
      if (EXCLUDED.has(file)) {
        continue;
      }
      const where = relative(repoRoot, file);
      const original = await readFile(file, 'utf8');
      const judged = applyRoleTruth(original, { roles, write, where });
      failures.push(...judged.failures);
      if (write && judged.updated !== original) {
        await writeFile(file, judged.updated);
        rewritten.push(where);
      }
    }
  }
  if (write) {
    console.log(
      `[docs-role-truth] ${countWord} roles (${listText}); rewrote ` +
        `${String(rewritten.length)} file(s)`,
    );
    for (const file of rewritten) {
      console.log(`  ${file}`);
    }
    return 0;
  }
  if (failures.length > 0) {
    console.error(
      `[docs-role-truth] the docs disagree with the exported InvocationRole ` +
        `(${countWord}: ${listText}):`,
    );
    for (const failure of failures) {
      console.error(`  ${failure}`);
    }
    console.error('Run: node scripts/docs-role-truth.mjs --write');
    return 1;
  }
  console.log(`[docs-role-truth] the docs match the exported InvocationRole: ${countWord} roles`);
  return 0;
}

// Importing this module for its helpers must never run the gate: the
// tests import it, and a self-running module would scan the repo (and
// exit) on import.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(await main());
}
