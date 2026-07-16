#!/usr/bin/env node
/**
 * run-typedoc-checked.mjs - TypeDoc with the {@link} validation gate
 * (W-130) and the public-surface completeness gate.
 *
 * TypeDoc runs with `validation.invalidLink: true` (typedoc.json), but
 * its only escalation switch is the global `treatWarningsAsErrors`,
 * and the packages-mode conversion emits a small set of PRE-EXISTING
 * referenced-but-not-included converter notices. (The per-package tag
 * config of `entryPointStrategy: "packages"` does not inherit the
 * root options, so each package carries a typedoc.json extending
 * docs/typedoc.package.json for the tag vocabulary and the exclusion
 * switches.) Flipping the global flag would hold the W-130 fix
 * hostage to that cleanup, so this wrapper escalates EXACTLY these
 * classes:
 *
 *   - "Failed to resolve link to ..."            (broken {@link})
 *   - "... which was resolved but is not included ..." (link target
 *     not part of the docs)
 *   - "X, defined in ..., is referenced by Y but not included in the
 *     documentation" converter notices NOT in the frozen baseline
 *     below. A symbol referenced by an exported signature but missing
 *     from its package barrel lands here (that is how the unexported
 *     RunPlannedOptions of v1.12.0 slipped out); the fix is to export
 *     the symbol from the barrel, not to grow the baseline. A baseline
 *     entry that stops warning also fails, so the list only shrinks.
 *
 * Any such warning fails the build; everything else passes through
 * untouched. `skipErrorChecking: true` stays in typedoc.json on
 * purpose: TS errors are covered by the per-package typecheck gates,
 * TypeDoc must not duplicate them.
 *
 * Exit codes: 0 ok · 1 gated warnings or typedoc failure.
 */

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DOCS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const LINK_WARNING_RE = /Failed to resolve link to|which was resolved but is not included/;
const NOT_INCLUDED_RE =
  /^(?<symbol>.+?), defined in (?<definedIn>.+?), is referenced by .+? but not included in the documentation$/;
const ANSI_RE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

/**
 * The pre-existing referenced-but-not-included notices, frozen. Each is
 * an internal helper type inlined into a public signature long before
 * this gate existed. Entries may only be REMOVED (export the symbol or
 * exclude the reference, then delete the line); never add one for a new
 * public type - export it from the package barrel instead.
 */
const NOT_INCLUDED_BASELINE = new Set([
  'StandardTypedV1.InferInput (@rulvar/core/src/vendor/standard-schema.d.ts)',
  'StandardTypedV1.InferOutput (@rulvar/core/src/vendor/standard-schema.d.ts)',
  'StandardTypedV1.Types (@rulvar/core/src/vendor/standard-schema.d.ts)',
  'StandardTypedV1 (@rulvar/core/src/vendor/standard-schema.d.ts)',
  'BaseAppend (@rulvar/core/src/journal/replayer.ts)',
  'Block (@rulvar/anthropic/src/wire.ts)',
  'MappedStop (@rulvar/anthropic/src/wire.ts)',
  'VcrHeader (@rulvar/testing/src/vcr.ts)',
  'KbSweepCliConfig (@rulvar/cli/src/config.ts)',
  'OtelContextApi (@rulvar/cli/src/otel.ts)',
  'LoadedWorkflowModule (@rulvar/cli/src/config.ts)',
]);

const result = spawnSync('npx', ['typedoc', '--options', './typedoc.json'], {
  cwd: DOCS_DIR,
  encoding: 'utf8',
  shell: process.platform === 'win32',
  maxBuffer: 64 * 1024 * 1024,
});

const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');

// NOTE: this script must NEVER call process.exit() - on CI the stdio
// are pipes, writes are asynchronous, and an immediate exit truncates
// everything buffered (the first failures were undiagnosable exactly
// because the verdict, the tail, and typedoc's own [error] lines died
// in the buffer). Setting process.exitCode lets node flush and exit
// naturally.
if (result.status !== 0) {
  // CI log viewers also truncate long streams, and the interesting
  // lines (typedoc's [error] entries + the run summary) sit at the
  // END - re-print them compactly so a failure is diagnosable.
  if (result.error) console.error(`[run-typedoc-checked] spawn error: ${result.error}`);
  const tail = output.split('\n').slice(-120).join('\n');
  console.error('[run-typedoc-checked] last 120 lines of typedoc output:');
  console.error(tail);
  console.error(`[run-typedoc-checked] typedoc exited ${result.status}.`);
  process.exitCode = result.status ?? 1;
}

if (process.exitCode !== undefined && process.exitCode !== 0) {
  // typedoc already failed; skip the scans (their input is partial).
} else {
  runLinkScan();
  runNotIncludedScan();
}

function runLinkScan() {
  const offenders = output
    .split('\n')
    .filter((line) => LINK_WARNING_RE.test(line))
    // Strip ANSI colour codes for a clean report (the ESC byte is the
    // point here, so the regex is built from its char code to keep the
    // source free of control characters).
    .map((line) => line.replace(ANSI_RE, '').trim());

  if (offenders.length > 0) {
    console.error(
      `\n[run-typedoc-checked] FAIL - ${offenders.length} {@link} validation warning(s) (W-130):`,
    );
    for (const line of offenders) console.error(`  ${line}`);
    console.error(
      '\nFix the TSDoc link (prefer a resolvable target; use plain `code` text for ' +
        'cross-package/unexported references) - see the wave-6 W-130 sweep for examples.',
    );
    process.exitCode = 1;
    return;
  }
  console.log('[run-typedoc-checked] OK - no {@link} validation warnings.');
}

function runNotIncludedScan() {
  const seen = new Set();
  for (const raw of output.split('\n')) {
    const line = raw.replace(ANSI_RE, '').replace(/^\[warning\]\s*/, '').trim();
    const match = NOT_INCLUDED_RE.exec(line);
    if (match?.groups !== undefined) {
      seen.add(`${match.groups.symbol} (${match.groups.definedIn})`);
    }
  }

  const fresh = [...seen].filter((key) => !NOT_INCLUDED_BASELINE.has(key));
  const stale = [...NOT_INCLUDED_BASELINE].filter((key) => !seen.has(key));

  if (fresh.length > 0) {
    console.error(
      `\n[run-typedoc-checked] FAIL - ${fresh.length} new referenced-but-not-included symbol(s):`,
    );
    for (const key of fresh) console.error(`  ${key}`);
    console.error(
      '\nA public signature references a symbol the docs cannot render. Export the ' +
        'symbol from its package barrel (the usual fix) or exclude the referencing ' +
        'signature; do not add baseline entries for new public types.',
    );
    process.exitCode = 1;
  }
  if (stale.length > 0) {
    console.error(
      `\n[run-typedoc-checked] FAIL - ${stale.length} stale baseline entr(y/ies) no longer warned by typedoc:`,
    );
    for (const key of stale) console.error(`  ${key}`);
    console.error(
      '\nDelete the listed line(s) from NOT_INCLUDED_BASELINE in docs/scripts/run-typedoc-checked.mjs ' +
        'so the baseline only ever shrinks.',
    );
    process.exitCode = 1;
  }
  if (fresh.length === 0 && stale.length === 0) {
    console.log(
      `[run-typedoc-checked] OK - referenced-but-not-included matches the frozen baseline (${NOT_INCLUDED_BASELINE.size}).`,
    );
  }
}
