import { describe, expect, it } from 'vitest';

import {
  ConfigError,
  createCanonicalIdMinter,
  EMPTY_SCHEMA_HASH,
  RulvarError,
  schemaHash,
} from './index.js';

describe('@rulvar/core public surface', () => {
  it('exposes the M1 L0 contracts', () => {
    expect(new ConfigError('x')).toBeInstanceOf(RulvarError);
    expect(createCanonicalIdMinter()()).toHaveLength(26);
    expect(schemaHash(undefined)).toBe(EMPTY_SCHEMA_HASH);
  });
});
