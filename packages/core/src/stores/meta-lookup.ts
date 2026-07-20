/**
 * Meta lookup helpers (v1.25.0 scale review): the capability guard and
 * the one fallback point every point lookup goes through, so a store
 * with `getMeta` serves an exact query and a store without it degrades
 * to the historical `listRuns` scan instead of breaking.
 */
import type { JournalStore, MetaLookupStore, RunFilter, RunMeta } from '../l0/spi/store.js';

/** Capability guard, same shape as the lease capability detection. */
export function hasMetaLookup(store: JournalStore): store is MetaLookupStore {
  return typeof (store as Partial<MetaLookupStore>).getMeta === 'function';
}

/**
 * One run's meta: `getMeta` when the store has the capability, else the
 * full `listRuns` scan. `undefined` means the run is not in the store.
 */
export async function readRunMeta(
  store: JournalStore,
  runId: string,
): Promise<RunMeta | undefined> {
  if (hasMetaLookup(store)) {
    return store.getMeta(runId);
  }
  const metas = await store.listRuns();
  return metas.find((meta) => meta.runId === runId);
}

/**
 * The RunFilter predicate shared by the shipped stores (and usable by
 * callers re-checking an advisory `statuses` filter a legacy store may
 * have ignored). `status` and `statuses` combine as either-matches.
 */
export function metaMatchesFilter(meta: RunMeta, f?: RunFilter): boolean {
  if (f === undefined) {
    return true;
  }
  if (f.status !== undefined || f.statuses !== undefined) {
    const single = f.status !== undefined && meta.status === f.status;
    const multi = f.statuses !== undefined && f.statuses.includes(meta.status);
    if (!single && !multi) {
      return false;
    }
  }
  if (f.name !== undefined && meta.name !== f.name) {
    return false;
  }
  if (f.tags !== undefined && !f.tags.every((tag) => meta.tags?.includes(tag) === true)) {
    return false;
  }
  return true;
}
