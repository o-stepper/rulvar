import { describe, expect, it } from 'vitest';

import { ConfigError } from './errors.js';
import { assertSafeRunId } from './run-id.js';

describe('assertSafeRunId (v1.36.0 review SEC-P1)', () => {
  it.each(['run-1', 'tenant_42.run', '01JABCDEF0123456789ABCDEFG', 'a', 'A.B-C_1'])(
    'accepts the filesystem-safe id %j',
    (runId) => {
      expect(() => assertSafeRunId(runId, 'ctx')).not.toThrow();
    },
  );

  it.each(['', '.', '..', '../evil', 'a/b', 'a\\b', 'has space', 'name\twith\ttabs'])(
    'refuses the unsafe id %j with a typed ConfigError naming the context',
    (runId) => {
      expect(() => assertSafeRunId(runId, 'ctx')).toThrow(ConfigError);
      expect(() => assertSafeRunId(runId, 'ctx')).toThrow(/ctx: runId .* is not filesystem-safe/);
    },
  );

  it('refuses a non-string id (defensive against untyped callers)', () => {
    expect(() => assertSafeRunId(undefined as unknown as string, 'ctx')).toThrow(ConfigError);
    expect(() => assertSafeRunId(null as unknown as string, 'ctx')).toThrow(ConfigError);
  });
});
