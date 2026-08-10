// The mutation manifest's merge driver (the P2 seed of plan 27).
//
// Three releases running were paid for by one mistake in one place: a
// conflict in the manifest tail, resolved by hand. The conflict's shape
// is a trap. Both sides are entry BODIES inside a single array literal,
// so "keep both sides" reads as obviously right and silently drops the
// `},` and the `{` between them. Two entries fuse into one, JS keeps the
// last of every duplicated key without a word, and a probe leaves the
// manifest taking its doctrine with it. RV2606 and RV2705 built the
// gates that CATCH that afterwards; this is the half that stops it
// happening.
//
// The merge is decidable without a human because of what the manifest
// is: an append-only array of entries keyed by `id`, whose order
// carries no meaning. The entry is the unit and `id` is its identity,
// so two branches that each appended an entry have not touched the same
// thing at all, and the tail conflict git reports is an artefact of
// reading the file as lines. Only two sides editing ONE entry is a real
// disagreement, and those this driver hands back to git rather than
// guessing.
//
// A merge driver rather than a repair command, because the moment that
// matters is the moment git asks. A `--resolve-tail` subcommand would be
// one more thing to remember at exactly the moment the tail is already
// mangled and the author is mid-rebase.
//
// Registered per clone, since git keeps merge drivers in config and
// never in the tree; the root `prepare` script does it on install. An
// unregistered clone silently gets the ordinary text merge, which is
// today's behaviour, and the RV2705 source gate still refuses the fused
// result: prevention here, detection there, neither depending on the
// other.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { checkSourceShape } from './mutation-fragments.mjs';

/** The driver's name in git config, and in `.gitattributes`. */
export const DRIVER = 'rulvar-mutation-manifest';

/** The command git config points at, resolved from the work tree root. */
export const COMMAND = 'node scripts/merge-mutation-manifest.mjs %O %A %B %L %P';

// The committed formatting, which is itself a CI gate, is what makes the
// split decidable by reading lines: the array opens at column zero, an
// entry opens at exactly two spaces and closes at exactly two, and its
// keys sit at four. `checkSourceShape` leans on the same shape, so a
// drift blinds both at once rather than one of them quietly.
const OPEN = 'export const MUTATIONS = [';
const ENTRY_OPEN = '  {';
const ENTRY_CLOSE = '  },';
const ARRAY_CLOSE = '];';

const ID = /^ {4}id: '([^']*)',$/mu;

/**
 * Split a manifest module into the text before the array, the entry
 * blocks, and the text after.
 *
 * `undefined` for anything that is not exactly this shape (no array, an
 * unterminated entry, a stray line between entries), because a driver
 * that guesses at a file it cannot read is worse than the text merge it
 * replaces.
 *
 * @param {string} text
 * @returns {{ head: string, entries: string[], tail: string } | undefined}
 */
export function splitManifest(text) {
  const lines = text.split('\n');
  const open = lines.indexOf(OPEN);
  if (open === -1) {
    return undefined;
  }
  /** @type {string[]} */
  const entries = [];
  /** @type {string[] | undefined} */
  let block;
  let index = open + 1;
  for (; index < lines.length; index += 1) {
    const line = lines[index];
    if (block === undefined) {
      if (line === ARRAY_CLOSE) {
        break;
      }
      if (line !== ENTRY_OPEN) {
        return undefined;
      }
      block = [line];
      continue;
    }
    block.push(line);
    if (line === ENTRY_CLOSE) {
      entries.push(block.join('\n'));
      block = undefined;
    }
  }
  if (block !== undefined || index === lines.length) {
    return undefined;
  }
  return {
    head: lines.slice(0, open + 1).join('\n'),
    entries,
    tail: lines.slice(index).join('\n'),
  };
}

/**
 * Index one side's entries by id.
 *
 * A side that cannot be indexed is reported rather than thrown: the
 * caller's answer to every problem here is the same fallback, and the
 * reason is worth printing.
 *
 * @param {string[]} entries
 * @returns {{ byId: Map<string, string>, problem?: string }}
 */
export function indexEntries(entries) {
  /** @type {Map<string, string>} */
  const byId = new Map();
  for (const entry of entries) {
    const id = ID.exec(entry)?.[1];
    if (id === undefined) {
      return { byId, problem: 'an entry with no id' };
    }
    if (byId.has(id)) {
      return { byId, problem: `the id '${id}' twice` };
    }
    byId.set(id, entry);
  }
  return { byId };
}

/**
 * The three-way choice for a region only one side may own.
 *
 * @param {string} base
 * @param {string} ours
 * @param {string} theirs
 * @returns {string | undefined}
 */
function pickRegion(base, ours, theirs) {
  if (ours === theirs || theirs === base) {
    return ours;
  }
  if (ours === base) {
    return theirs;
  }
  return undefined;
}

/**
 * Merge three versions of the manifest by entry id.
 *
 * Ours keeps its order and theirs contributes what only it has, in its
 * own order, appended: the array is append-only and its order carries
 * no meaning, so this is the shape a human resolving the tail was
 * always aiming at.
 *
 * @param {string} baseText
 * @param {string} oursText
 * @param {string} theirsText
 * @returns {{ ok: true, text: string, entries: number } | { ok: false, reason: string }}
 */
export function mergeManifests(baseText, oursText, theirsText) {
  const base = splitManifest(baseText);
  const ours = splitManifest(oursText);
  const theirs = splitManifest(theirsText);
  if (base === undefined || ours === undefined || theirs === undefined) {
    return {
      ok: false,
      reason: 'one of the three versions is not a manifest this driver can read',
    };
  }
  const head = pickRegion(base.head, ours.head, theirs.head);
  const tail = pickRegion(base.tail, ours.tail, theirs.tail);
  if (head === undefined || tail === undefined) {
    return { ok: false, reason: 'both sides changed the code around the manifest' };
  }
  const baseIndex = indexEntries(base.entries);
  const ourIndex = indexEntries(ours.entries);
  const theirIndex = indexEntries(theirs.entries);
  const broken = [
    { name: 'the base', indexed: baseIndex },
    { name: 'our side', indexed: ourIndex },
    { name: 'their side', indexed: theirIndex },
  ].find((side) => side.indexed.problem !== undefined);
  if (broken !== undefined) {
    return { ok: false, reason: `${broken.name} carries ${String(broken.indexed.problem)}` };
  }
  const baseById = baseIndex.byId;
  const ourById = ourIndex.byId;
  const theirById = theirIndex.byId;
  /** @type {string[]} */
  const merged = [];
  for (const [id, ourEntry] of ourById) {
    const baseEntry = baseById.get(id);
    const theirEntry = theirById.get(id);
    if (baseEntry === undefined) {
      if (theirEntry !== undefined && theirEntry !== ourEntry) {
        return { ok: false, reason: `both sides added '${id}', differently` };
      }
      merged.push(ourEntry);
      continue;
    }
    if (theirEntry === undefined) {
      if (ourEntry !== baseEntry) {
        return { ok: false, reason: `we changed '${id}' and they deleted it` };
      }
      continue;
    }
    // The side that did not touch an entry never overwrites the side
    // that did, in either direction; identical changes are one change.
    if (ourEntry === baseEntry) {
      merged.push(theirEntry);
      continue;
    }
    if (theirEntry === baseEntry || theirEntry === ourEntry) {
      merged.push(ourEntry);
      continue;
    }
    return { ok: false, reason: `both sides changed '${id}'` };
  }
  for (const [id, theirEntry] of theirById) {
    if (ourById.has(id)) {
      continue;
    }
    const baseEntry = baseById.get(id);
    if (baseEntry === undefined) {
      merged.push(theirEntry);
      continue;
    }
    if (theirEntry !== baseEntry) {
      return { ok: false, reason: `they changed '${id}' and we deleted it` };
    }
  }
  const text = [head, ...merged, tail].join('\n');
  // The driver validates its own output with the gate that exists
  // because of this file's absence: a driver that trusts itself is
  // exactly the failure it was written to prevent, and a side that
  // arrives already fused must not be propagated in silence.
  const problems = checkSourceShape(text, merged.length);
  if (problems.length > 0) {
    return {
      ok: false,
      reason: `the merged manifest fails the source gate (${problems
        .map((problem) => `${problem.id}: ${problem.kind}`)
        .join(', ')})`,
    };
  }
  return { ok: true, text, entries: merged.length };
}

/**
 * Hand the merge back to git, exactly as an unregistered clone would
 * see it, and refuse a CLEAN text merge that fused two entries.
 *
 * The count compared against is the count found in the same text, so
 * only the fusion signal can fire here: the entry count the module ought
 * to export belongs to the module, and this path does not claim to know
 * it.
 *
 * @param {string} basePath
 * @param {string} oursPath
 * @param {string} theirsPath
 * @param {string | undefined} markerSize
 * @returns {number}
 */
function fallBack(basePath, oursPath, theirsPath, markerSize) {
  const args = ['merge-file', '-L', 'ours', '-L', 'base', '-L', 'theirs'];
  if (markerSize !== undefined && markerSize !== '') {
    args.push(`--marker-size=${markerSize}`);
  }
  const run = spawnSync('git', [...args, oursPath, basePath, theirsPath], { stdio: 'inherit' });
  if (run.status !== 0) {
    return 1;
  }
  const text = readFileSync(oursPath, 'utf8');
  const blocks = text.split('\n').filter((line) => line === ENTRY_OPEN).length;
  const fused = checkSourceShape(text, blocks);
  if (fused.length === 0) {
    return 0;
  }
  console.error(
    `[merge-manifest] the text merge came out clean but ${String(fused.length)} entr(y/ies) ` +
      'declare a key twice: two entries fused into one. Reported as a conflict instead, because a ' +
      'conflict a human resolves is recoverable and a fused entry is not.',
  );
  return 1;
}

/**
 * Register the driver in this clone's git config.
 *
 * Never fails the caller: this runs from `prepare`, so a clone with no
 * git, or none writable, must still install. Without the registration
 * the manifest merges the way it always did, and the RV2705 gate is
 * still there.
 *
 * @returns {void}
 */
export function install() {
  const top = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (top.status !== 0) {
    return;
  }
  const set = (/** @type {string} */ key, /** @type {string} */ value) =>
    spawnSync('git', ['config', '--local', key, value], { encoding: 'utf8' });
  const name = set(`merge.${DRIVER}.name`, 'the mutation manifest, merged by entry id');
  const driver = set(`merge.${DRIVER}.driver`, COMMAND);
  if (name.status !== 0 || driver.status !== 0) {
    console.warn(
      `[merge-manifest] could not register the '${DRIVER}' merge driver; conflicts in the ` +
        'manifest tail stay manual (see CONTRIBUTING.md)',
    );
  }
}

/**
 * @param {string[]} argv
 * @returns {number}
 */
function main(argv) {
  if (argv[0] === '--install') {
    install();
    return 0;
  }
  const [basePath, oursPath, theirsPath, markerSize] = argv;
  if (basePath === undefined || oursPath === undefined || theirsPath === undefined) {
    console.error(
      'Usage: node scripts/merge-mutation-manifest.mjs --install\n' +
        '       node scripts/merge-mutation-manifest.mjs <base> <ours> <theirs> [marker-size] [path]',
    );
    return 2;
  }
  const merged = mergeManifests(
    readFileSync(basePath, 'utf8'),
    readFileSync(oursPath, 'utf8'),
    readFileSync(theirsPath, 'utf8'),
  );
  if (merged.ok) {
    writeFileSync(oursPath, merged.text);
    console.error(
      `[merge-manifest] merged by entry id: ${String(merged.entries)} entries, no conflict`,
    );
    return 0;
  }
  console.error(`[merge-manifest] ${merged.reason}: falling back to the ordinary text merge`);
  return fallBack(basePath, oursPath, theirsPath, markerSize);
}

// The RV2603 guard: importing this module (the tests do) must not run a
// merge.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
