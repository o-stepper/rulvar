// Source Cyrillic gate: the framework is English-only EVERYWHERE, test
// fixtures included (repository policy, 2026-07-19). Non-ASCII fixture
// text is legitimate (unicode-hostile inputs must stay covered), so the
// gate bans exactly the Cyrillic blocks, not non-ASCII at large. Built
// from escaped codepoints like the control-byte gate beside it: a
// literal Cyrillic character here would make this gate flag itself.
//
//   node scripts/source-cyrillic.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const EXTENSIONS = /\.(ts|tsx|mts|cts|js|mjs|cjs|json|md|yml|yaml)$/;
// Cyrillic, Cyrillic Supplement, Extended A/B/C: U+0400..U+052F, U+2DE0..U+2DFF, U+A640..U+A69F, U+1C80..U+1C8F
const FORBIDDEN = new RegExp('[\\u0400-\\u052F\\u2DE0-\\u2DFF\\uA640-\\uA69F\\u1C80-\\u1C8F]', 'u');

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter((file) => EXTENSIONS.test(file));

const offenders = [];
for (const file of tracked) {
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const match = FORBIDDEN.exec(content);
  if (match !== null) {
    const line = content.slice(0, match.index).split('\n').length;
    const code = match[0].codePointAt(0)?.toString(16).padStart(4, '0') ?? '????';
    offenders.push(`${file}:${String(line)}: Cyrillic character U+${code.toUpperCase()}`);
  }
}

if (offenders.length > 0) {
  console.error('[source-cyrillic] Cyrillic characters in tracked sources:');
  for (const offender of offenders) {
    console.error(`  ${offender}`);
  }
  console.error(
    '[source-cyrillic] the framework is English-only everywhere, fixtures included; ' +
      'use non-Cyrillic unicode (diacritics, CJK) where a non-ASCII fixture is needed.',
  );
  process.exit(1);
}
console.log(`[source-cyrillic] ${String(tracked.length)} files clean`);
