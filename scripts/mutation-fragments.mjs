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

/** Every field a manifest entry must carry to be executable at all. */
const REQUIRED = ['id', 'doctrine', 'file', 'find', 'replace', 'test'];

/**
 * Every way the manifest SOURCE can be broken while the value it
 * evaluates to looks perfect (RV2705).
 *
 * Two entries fused into one is the shape that got here: resolving a
 * rebase conflict in the manifest tail lost the `},` and `{` between
 * two entries, the second entry's fields overwrote the first's inside
 * one object literal, and one probe silently left the manifest. JS
 * keeps the LAST of a duplicated key without a word, so by the time
 * anything imports this file the loss is unrecoverable: the shape
 * check above sees a well-formed entry, every fragment resolves, and
 * the count is one lower than it should be with nobody to say what the
 * right count was.
 *
 * The signal survives only in the text: one object literal declaring
 * `id` twice. So this reads the file rather than the value.
 *
 * It leans on the committed formatting, which is itself a CI gate:
 * entries open at `  {` and close at `  },`, their keys sit at four
 * spaces, and a wrapped string continues at six or more. A drift in
 * that shape would make the scan blind, so it also reports when the
 * number of entry blocks it found disagrees with the number of entries
 * the module exports, and a gate that cannot see is louder than a gate
 * that passes.
 *
 * @param {string} source the manifest module's text
 * @param {number} entryCount how many entries the module exports
 * @returns {{ id: string, kind: string, key?: string, found?: number, expected?: number }[]}
 */
export function checkSourceShape(source, entryCount) {
  const problems = [];
  const lines = source.split('\n');
  let blocks = 0;
  /** @type {{ id: string, keys: Set<string> } | undefined} */
  let block;
  for (const line of lines) {
    if (line === '  {') {
      blocks += 1;
      block = { id: `#${String(blocks - 1)}`, keys: new Set() };
      continue;
    }
    if (block === undefined) {
      continue;
    }
    if (line === '  },') {
      block = undefined;
      continue;
    }
    const key = /^ {4}([A-Za-z_$][\w$]*):/u.exec(line);
    if (key?.[1] === undefined) {
      continue;
    }
    const name = key[1];
    const id = /^ {4}id: '([^']*)'/u.exec(line);
    if (id?.[1] !== undefined) {
      block.id = id[1];
    }
    if (block.keys.has(name)) {
      problems.push({ id: block.id, kind: 'duplicate-key', key: name });
      continue;
    }
    block.keys.add(name);
  }
  if (blocks !== entryCount) {
    problems.push({
      id: 'manifest',
      kind: 'block-count-mismatch',
      found: blocks,
      expected: entryCount,
    });
  }
  return problems;
}

/**
 * Every way a manifest entry is unrunnable BEFORE any file is read
 * (RV2606).
 *
 * The fragment check below answers "does this entry still address its
 * source". It does not answer "is this an entry at all", and the
 * difference cost eighteen minutes: a conflict resolution dropped one
 * `test` field, every fragment resolved, and the full manifest ran to
 * that entry and died on `mutation.test.endsWith` at minute eighteen.
 * A missing field, a duplicate id, and a `replace` equal to its `find`
 * (a mutation that mutates nothing and can only ever SURVIVE, reading
 * as a hole in the suite) are all decidable from the manifest alone.
 *
 * Reported beside the fragment problems rather than thrown, because a
 * gate that stops at the first failure turns one bad edit into a queue
 * of CI round trips.
 */
export function checkShape(mutations) {
  const problems = [];
  const seen = new Map();
  mutations.forEach((mutation, index) => {
    const id = typeof mutation?.id === 'string' ? mutation.id : `#${String(index)}`;
    if (typeof mutation !== 'object' || mutation === null) {
      problems.push({ id, kind: 'not-an-entry' });
      return;
    }
    const missing = REQUIRED.filter((field) => typeof mutation[field] !== 'string');
    if (missing.length > 0) {
      problems.push({ id, kind: 'missing-fields', fields: missing });
    }
    // Registered even for an entry reported above, so a duplicate can
    // never hide behind a malformed sibling: `--only <id>` selects by
    // id, and a duplicate makes one of the two unrunnable on its own
    // and both indistinguishable in the log the full run prints.
    if (typeof mutation.id === 'string') {
      const first = seen.get(mutation.id);
      if (first === undefined) {
        seen.set(mutation.id, index);
      } else {
        problems.push({ id, kind: 'duplicate-id', firstAt: first });
      }
    }
    if (missing.length > 0) {
      return;
    }
    if (mutation.replace === mutation.find) {
      problems.push({ id, kind: 'inert' });
    }
  });
  return problems;
}

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
