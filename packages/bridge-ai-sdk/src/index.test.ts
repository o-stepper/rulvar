import { describe, expect, it } from 'vitest';

import { M0_SCAFFOLD } from './index.js';

describe('@lurker/bridge-ai-sdk scaffold', () => {
  it('exports the M0 scaffold marker', () => {
    expect(M0_SCAFFOLD).toBe('@lurker/bridge-ai-sdk');
  });
});
