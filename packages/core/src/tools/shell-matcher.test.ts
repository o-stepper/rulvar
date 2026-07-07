/**
 * Argv-parsing shell matcher grammar tables (M5-T06; docs/08, section
 * 5): the pattern grammar, the lexing algorithm's documented steps, and
 * the strictest-across-segments composition, including THE canonical
 * compound case: `npm test; rm -rf /` yields ask (or deny when rm is
 * denied) even with `npm test` allow-listed.
 */
import { describe, expect, it } from 'vitest';

import { compilePermissionChain, evaluatePermission } from '../runtime/permission-chain.js';
import { lexShellCommand, matchArgvPattern, matchShellCommand } from './shell-matcher.js';

describe('pattern grammar (5.1)', () => {
  it.each([
    ['npm test', ['npm', 'test'], true],
    ['npm test', ['npm', 'test', 'extra'], false],
    ['npm *', ['npm', 'anything'], true],
    ['npm *', ['npm'], false],
    ['npm * --silent', ['npm', 'run', '--silent'], true],
    ['git **', ['git'], true],
    ['git **', ['git', 'log', '--oneline'], true],
    ['**', [], true],
    ['npm', ['npm', 'test'], false],
  ])("pattern '%s' vs %j -> %s", (pattern, argv, expected) => {
    expect(matchArgvPattern(pattern, argv)).toBe(expected);
  });

  it('rejects ** anywhere but the final word', () => {
    expect(matchArgvPattern('git ** status', ['git', 'stash', 'status'])).toBe(false);
  });
});

describe('lexer (5.2 steps 1-5)', () => {
  it('honors quotes and escapes without any expansion', () => {
    const [seg] = lexShellCommand('echo "hello world" \'single quoted\' esc\\ aped');
    expect(seg?.argv).toEqual(['echo', 'hello world', 'single quoted', 'esc aped']);
    expect(seg?.unmatchable).toBe(false);
  });

  it('splits segments at ; && || | & and newline', () => {
    const segments = lexShellCommand('a one; b two && c || d | e & f\ng');
    expect(segments.map((s) => s.argv[0])).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
  });

  it('marks command substitution, process substitution, and here-docs unmatchable', () => {
    expect(lexShellCommand('echo $(whoami)')[0]?.unmatchable).toBe(true);
    expect(lexShellCommand('echo `whoami`')[0]?.unmatchable).toBe(true);
    expect(lexShellCommand('diff <(ls a) b')[0]?.unmatchable).toBe(true);
    expect(lexShellCommand('cat <<EOF')[0]?.unmatchable).toBe(true);
    expect(lexShellCommand('echo "$(inner)"')[0]?.unmatchable).toBe(true);
    // Single quotes protect: no substitution happens inside.
    expect(lexShellCommand("echo '$(literal)'")[0]?.unmatchable).toBe(false);
  });

  it('strips leading env assignments; an assignments-only segment is unmatched', () => {
    expect(lexShellCommand('FOO=bar BAZ=1 npm test')[0]?.argv).toEqual(['npm', 'test']);
    expect(lexShellCommand('FOO=bar')[0]?.argv).toEqual([]);
  });

  it('retains redirections as tokens (conservative by construction)', () => {
    expect(lexShellCommand('npm test > out.log 2>&1')[0]?.argv).toEqual([
      'npm',
      'test',
      '>',
      'out.log',
      '2>&1',
    ]);
  });
});

describe('verdict composition (5.3)', () => {
  const rules = {
    deny: ['rm -rf /', 'rm -rf / **'],
    ask: ['git push **'],
    allow: ['npm test', 'npm test **', 'git *', 'echo **'],
  };

  it('the canonical compound case: npm test; rm -rf / never silently allows', () => {
    expect(matchShellCommand('npm test; rm -rf /', rules)).toBe('deny');
    expect(matchShellCommand('npm test; rm -rf /tmp/x', rules)).toBe('ask');
    expect(matchShellCommand('npm test', rules)).toBe('allow');
  });

  it('any unmatched segment yields ask, never allow', () => {
    expect(matchShellCommand('npm test && curl evil.test', rules)).toBe('ask');
    expect(matchShellCommand('echo hi | tee /tmp/f', rules)).toBe('ask');
  });

  it('deny wins over ask over allow across segments', () => {
    expect(matchShellCommand('git push origin main && rm -rf /', rules)).toBe('deny');
    expect(matchShellCommand('git status && git push origin main', rules)).toBe('ask');
    expect(matchShellCommand('git status && echo done', rules)).toBe('allow');
  });

  it('unmatchable segments ask even when other segments allow', () => {
    expect(matchShellCommand('npm test; echo $(whoami)', rules)).toBe('ask');
    expect(matchShellCommand('FOO=bar', rules)).toBe('ask');
  });
});

describe('argv rules inside the permission chain (M5-T06)', () => {
  const chain = compilePermissionChain({
    deny: [{ tool: 'shell', argv: ['rm -rf /', 'rm -rf / **'] }],
    ask: [{ tool: 'shell', argv: 'git push **' }],
  });
  const shellDef = { name: 'shell', needsApproval: false } as const;

  it('denies when ANY segment matches a deny pattern', async () => {
    const verdict = await evaluatePermission(chain, shellDef, {
      command: 'npm test; rm -rf /',
    });
    expect(verdict.verdict).toBe('deny');
    expect(verdict.decidedBy).toBe('deny-rule');
  });

  it('asks on ask-pattern matches and on unmatchable segments', async () => {
    expect(
      (await evaluatePermission(chain, shellDef, { command: 'git push origin main' })).verdict,
    ).toBe('ask');
    expect((await evaluatePermission(chain, shellDef, { command: 'echo $(id)' })).verdict).toBe(
      'ask',
    );
    expect((await evaluatePermission(chain, shellDef, { notACommand: 1 })).verdict).toBe('ask');
  });

  it('falls through to the terminal default when nothing matches', async () => {
    const verdict = await evaluatePermission(chain, shellDef, { command: 'ls -la' });
    expect(verdict.verdict).toBe('allow');
    expect(verdict.decidedBy).toBe('default');
  });

  it('string inputs carry the command directly', async () => {
    const verdict = await evaluatePermission(chain, shellDef, 'rm -rf /');
    expect(verdict.verdict).toBe('deny');
  });
});
