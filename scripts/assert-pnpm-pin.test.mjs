// The pnpm pin guard's contract (RV4411): a matching pin passes, a
// mismatch names both versions and the trap, a non-pnpm launch names
// itself. The guard is exercised by spawning it with a controlled
// user agent, exactly how pnpm hands the identity to children.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pin = String(
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).packageManager,
).split('@')[1];

const run = (userAgent) => {
  try {
    const stdout = execFileSync(
      process.execPath,
      [new URL('./assert-pnpm-pin.mjs', import.meta.url).pathname],
      {
        env: { ...process.env, npm_config_user_agent: userAgent },
        encoding: 'utf8',
      },
    );
    return { code: 0, out: stdout };
  } catch (thrown) {
    return { code: thrown.status ?? 1, out: String(thrown.stderr ?? '') };
  }
};

test('the running pin passes and says so', () => {
  const result = run(`pnpm/${pin} npm/? node/${process.version}`);
  assert.equal(result.code, 0);
  assert.match(result.out, new RegExp(`pnpm ${pin.replaceAll('.', '\\.')} matches`, 'u'));
});

test('a mismatched pnpm names both versions and the documented trap', () => {
  const result = run(`pnpm/11.1.2 npm/? node/${process.version}`);
  assert.equal(result.code, 1);
  assert.match(result.out, /running pnpm is 11\.1\.2 but packageManager pins/u);
  assert.match(result.out, /RV4306/u);
});

test('a non-pnpm launch refuses with the launch advice', () => {
  const result = run('npm/10.0.0 node/v24.0.0');
  assert.equal(result.code, 1);
  assert.match(result.out, /not launched through pnpm/u);
});
