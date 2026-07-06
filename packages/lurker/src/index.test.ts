import { describe, expect, it } from 'vitest';

import { M0_SCAFFOLD } from './index.js';

describe('@lurker/lurker scaffold', () => {
  it('exports the M0 scaffold marker', () => {
    expect(M0_SCAFFOLD).toBe('@lurker/lurker');
  });
});
