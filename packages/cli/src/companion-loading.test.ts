/**
 * Companion import classification (the v1.16.1 review P1): only a real
 * ERR_MODULE_NOT_FOUND naming the requested companion itself earns the
 * friendly install hint; a transitive miss inside a found companion or
 * any initialization throw surfaces as the module's own defect with the
 * original error preserved as cause. The packed-CLI E2E
 * (scripts/cli-smoke.mjs) proves the same classification end to end
 * against real npm layouts; these are the fast unit cases.
 */
import { describe, expect, it } from 'vitest';

import { ConfigError } from '@rulvar/core';

import { isCompanionMissing, loadCompanion } from './commands.js';

function moduleNotFound(specifier: string): Error {
  const error: NodeJS.ErrnoException = new Error(
    `Cannot find package '${specifier}' imported from /consumer/node_modules/@rulvar/cli/dist/io.js`,
  );
  error.code = 'ERR_MODULE_NOT_FOUND';
  return error;
}

describe('companion import classification (v1.16.1 review P1)', () => {
  it('classifies a missing companion by code AND quoted specifier', () => {
    expect(isCompanionMissing(moduleNotFound('@rulvar/planner'), '@rulvar/planner')).toBe(true);
  });

  it('never treats a transitive miss inside a found companion as missing', () => {
    // eslint missing INSIDE an installed @rulvar/planner: same Node
    // code, different quoted specifier (the companion name appears only
    // unquoted in the importer path).
    const transitive: NodeJS.ErrnoException = new Error(
      "Cannot find package 'eslint' imported from " +
        '/consumer/node_modules/@rulvar/planner/dist/index.js',
    );
    transitive.code = 'ERR_MODULE_NOT_FOUND';
    expect(isCompanionMissing(transitive, '@rulvar/planner')).toBe(false);
  });

  it('never treats an initialization throw as missing', () => {
    const boom = new ReferenceError('__filename is not defined in ES module scope');
    expect(isCompanionMissing(boom, '@rulvar/planner')).toBe(false);
    expect(isCompanionMissing('not even an error', '@rulvar/planner')).toBe(false);
  });

  it('loadCompanion returns the module when the import resolves', async () => {
    const module = { plan: () => undefined };
    await expect(
      loadCompanion<typeof module>(Promise.resolve(module), '@rulvar/planner', 'rulvar plan', 'x'),
    ).resolves.toBe(module);
  });

  it('loadCompanion maps a genuine miss to the friendly ConfigError verbatim', async () => {
    const missingMessage = 'rulvar plan requires @rulvar/planner; install it next to the CLI';
    const thrown = await loadCompanion(
      Promise.reject(moduleNotFound('@rulvar/planner')),
      '@rulvar/planner',
      'rulvar plan',
      missingMessage,
    ).then(
      () => undefined,
      (error: unknown) => error,
    );
    expect(thrown).toBeInstanceOf(ConfigError);
    expect((thrown as ConfigError).message).toBe(missingMessage);
  });

  it('loadCompanion surfaces a broken installed companion with its cause', async () => {
    const boom = new ReferenceError('__filename is not defined in ES module scope');
    const thrown = await loadCompanion(
      Promise.reject(boom),
      '@rulvar/planner',
      'rulvar plan',
      'never shown',
    ).then(
      () => undefined,
      (error: unknown) => error,
    );
    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).not.toBeInstanceOf(ConfigError);
    const error = thrown as Error;
    expect(error.message).toContain('rulvar plan');
    expect(error.message).toContain('@rulvar/planner is installed but failed to load');
    expect(error.cause).toBe(boom);
  });
});
