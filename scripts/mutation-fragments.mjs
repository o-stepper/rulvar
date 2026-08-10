// The mutation manifest's fragment gate (RV2603).
//
// Every manifest entry addresses its source by an EXACT literal, and a
// refactor that moves the line makes the entry aim at nothing. The full
// probe already refuses that, but it discovers it one entry at a time,
// mid-manifest, after minutes of mutating files and re-running tests:
// RV2509 rewrote the claim-consistency meta assembly and orphaned
// `claim-coverage-envelope`, and the only surface that said so was the
// eighteen minute work-budget job, red long after every other check on
// the pull request had gone green.
//
// The same answer is a read of each file and a substring count. That
// belongs in the fast gates, so a refactor learns in a second that it
// moved a line a probe was aiming at.
//
// Its own module rather than a function inside the probe: a probe
// entry defending this rule must name a fragment that occurs ONCE in
// the file it points at, and the manifest quotes its own fragments
// verbatim, so a rule living beside the manifest can never be probed.

/**
 * Every way a manifest entry can stop addressing its source, decided by
 * reading the files and nothing else.
 *
 * Pure: `read` is injected, so the check is testable without a
 * manifest, a repository, or a single test run. `missing` means the
 * fragment is gone; `ambiguous` means it now matches more than once,
 * which the full run refuses too, because mutating the first occurrence
 * would silently test a line nobody chose.
 *
 * Each file is read once however many fragments aim at it, and every
 * problem is reported rather than the first: a gate that stops at one
 * failure turns a refactor into a queue of CI round trips.
 */
export function checkFragments(mutations, read) {
  const sources = new Map();
  const problems = [];
  for (const mutation of mutations) {
    let source = sources.get(mutation.file);
    if (source === undefined) {
      source = read(mutation.file);
      sources.set(mutation.file, source);
    }
    const occurrences = source.split(mutation.find).length - 1;
    if (occurrences === 1) {
      continue;
    }
    problems.push({
      id: mutation.id,
      file: mutation.file,
      kind: occurrences === 0 ? 'missing' : 'ambiguous',
      occurrences,
    });
  }
  return problems;
}
