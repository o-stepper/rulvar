/**
 * The effect lane kill point kit over the REAL sqlite store (plan 45):
 * leases, fences, and A5 contention are the store's own, so the
 * composition the RFC's fencing argument rests on is proven here, not
 * assumed.
 */
import { describe, it } from 'vitest';

import { effectsConformance } from '@rulvar/effects';
import { registerConformance } from '@rulvar/store-conformance';

import { SqliteStore } from './store.js';

registerConformance(
  effectsConformance({ store: () => new SqliteStore({ path: ':memory:', ttlMs: 600_000 }) }),
  { describe, it },
);
