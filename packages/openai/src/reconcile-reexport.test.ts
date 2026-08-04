// The statement reconciliation module moved to @rulvar/core (RV1703);
// this pins that the historical @rulvar/openai import path keeps
// serving the IDENTICAL function objects, so no consumer rebuild or
// import rewrite is ever forced by the move.
import { describe, expect, it } from 'vitest';

import { reconcileStatement as fromCore, statementFromRows as rowsFromCore } from '@rulvar/core';

import { reconcileStatement, statementFromRows } from './index.js';

describe('the reconcile re-export after the core lift (RV1703)', () => {
  it('serves the same module instances the core exports', () => {
    expect(reconcileStatement).toBe(fromCore);
    expect(statementFromRows).toBe(rowsFromCore);
  });
});
