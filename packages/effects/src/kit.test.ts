/**
 * The kill point kit over the in-memory reference store, under
 * explicitly single-process semantics (the RFC's stated posture for a
 * store that is not leasable at all).
 */
import { describe, it } from 'vitest';

import { InMemoryStore } from '@rulvar/core';
import { registerConformance } from '@rulvar/store-conformance';

import { effectsConformance } from './kit.js';

registerConformance(effectsConformance({ store: () => new InMemoryStore(), singleProcess: true }), {
  describe,
  it,
});
