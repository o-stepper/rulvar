import { describe, expect, it } from 'vitest';

import { SANDBOX_GLOBALS, compileScript } from './index.js';

describe('@rulvar/planner package surface', () => {
  it('exports the compile surface', () => {
    expect(typeof compileScript).toBe('function');
    expect(SANDBOX_GLOBALS).toHaveLength(12);
  });
});
