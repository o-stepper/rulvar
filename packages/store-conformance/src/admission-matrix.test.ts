/**
 * The admission matrix over the in-memory reference scheduler: the
 * snapshot/hydrate pair plays the crash rows' reopen.
 */
import { describe, it } from 'vitest';

import { MemoryAdmissionScheduler } from '@rulvar/core';

import { admissionConformance } from './admission-matrix.js';
import { registerConformance } from './types.js';

registerConformance(
  admissionConformance({
    make: (config, now) => {
      let current = new MemoryAdmissionScheduler({ ...config, now });
      return {
        get scheduler() {
          return current;
        },
        reopen: () => {
          current = new MemoryAdmissionScheduler({ ...config, now, state: current.snapshot() });
          return current;
        },
      };
    },
  }),
  { describe, it },
);
