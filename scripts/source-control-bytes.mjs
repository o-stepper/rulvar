// Source control-byte gate (the v1.22.0 review P1-1 postmortem): the
// resume-ordinal P1 existed because a LITERAL NUL byte sat inside a
// template literal in replayer.ts, invisible in every editor and code
// review, while the second site spelled a space; the file even greppe'd
// as binary for months without anyone connecting the dots. Control
// characters in source are always representable as escape sequences
// ('\u0000', '\u001B'), so a literal one is never intentional. This
// gate fails the build when any tracked source file carries a literal
// C0 control byte (except tab, LF, CR) so the class cannot return.
//
//   node scripts/source-control-bytes.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const EXTENSIONS = /\.(ts|tsx|mts|cts|js|mjs|cjs|json|md|yml|yaml)$/;
// Tab (0x09), LF (0x0A), CR (0x0D) are legitimate whitespace.
// Built from escaped codepoints; a literal control byte here would
// make this gate flag itself.
const FORBIDDEN = new RegExp('[\u0000-\u0008\u000B\u000C\u000E-\u001F]', 'u');

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
    const code = match[0].charCodeAt(0).toString(16).padStart(4, '0');
    offenders.push(`${file}:${String(line)}: literal control byte U+${code.toUpperCase()}`);
  }
}

if (offenders.length > 0) {
  console.error('[source-control-bytes] literal control bytes in tracked sources:');
  for (const offender of offenders) {
    console.error(`  ${offender}`);
  }
  console.error(
    '[source-control-bytes] spell control characters as escape sequences ' +
      "('\\u0000', '\\u001B'); literal bytes are invisible in review and " +
      'caused the v1.22.0 resume-ordinal P1.',
  );
  process.exit(1);
}
console.log(`[source-control-bytes] ${String(tracked.length)} files clean`);
