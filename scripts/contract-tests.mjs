// Live adapter contract tests (M5-T04; docs/11, section 5.3): re-sends
// the requests of committed provider VCR cassettes (cassettes/vcr/*.jsonl)
// through the LIVE adapters and validates the wire contract: exactly one
// terminal event per stream, the Usage invariant, and the finish-reason
// vocabulary. Provider drift turns the scheduled run red (an issue is
// opened by the workflow); it never turns a PR red and never rerecords
// automatically.
//
// Keys come from the environment (ANTHROPIC_API_KEY / OPENAI_API_KEY);
// spend and key custody are the founder budget item (docs/14). With no
// committed provider cassettes or no keys, the run reports and exits 0.
//
// Classification (RV4306): with `--classification-out FILE` every early
// exit and every provider lane writes its own machine-readable outcome
// row (scripts/contract-classification.mjs vocabulary) into FILE, so
// the release gate reads named realities instead of one green bit; the
// file must exist (the workflow's init step writes it). Without the
// flag, behavior is byte-identical to the pre-RV4306 script.
import { readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = (name) => pathToFileURL(join(root, 'packages', name, 'dist', 'index.js')).href;

const outFlag = process.argv.indexOf('--classification-out');
const classificationOut = outFlag >= 0 ? process.argv[outFlag + 1] : undefined;
const PROVIDERS = ['anthropic', 'openai'];
const record = (provider, outcome, extra = []) => {
  if (classificationOut === undefined) {
    return;
  }
  execFileSync(
    process.execPath,
    [
      join(root, 'scripts', 'contract-classification.mjs'),
      'record',
      '--out',
      classificationOut,
      '--suite',
      'vcr-contract',
      '--provider',
      provider,
      '--outcome',
      outcome,
      ...extra,
    ],
    { stdio: 'inherit' },
  );
};

const { readCassette } = await import(dist('testing'));

const VCR_DIR = join(root, 'cassettes', 'vcr');
const files = existsSync(VCR_DIR)
  ? readdirSync(VCR_DIR).filter((name) => name.endsWith('.jsonl'))
  : [];
if (files.length === 0) {
  console.log('no provider VCR cassettes committed yet (cassettes/vcr/); nothing to test');
  for (const provider of PROVIDERS) {
    record(provider, 'skipped-no-fixtures', [
      '--detail',
      'no provider VCR cassettes committed (cassettes/vcr/)',
    ]);
  }
  process.exit(0);
}

const keyOf = { anthropic: 'ANTHROPIC_API_KEY', openai: 'OPENAI_API_KEY' };
const adapters = new Map();
if (process.env.ANTHROPIC_API_KEY) {
  const { anthropic } = await import(dist('anthropic'));
  const adapter = anthropic();
  adapters.set(adapter.id, adapter);
}
if (process.env.OPENAI_API_KEY) {
  const { openai } = await import(dist('openai'));
  const adapter = openai();
  adapters.set(adapter.id, adapter);
}
if (adapters.size === 0) {
  console.log('no provider keys in the environment; skipping live contract tests');
  for (const provider of PROVIDERS) {
    record(provider, 'skipped-missing-secret', [
      '--detail',
      `${keyOf[provider]} absent from the environment`,
    ]);
  }
  process.exit(0);
}

const TERMINALS = new Set(['finish', 'error']);
const FINISH_REASONS = new Set([
  'stop',
  'tool-calls',
  'max-tokens',
  'context-window-exceeded',
  'refusal',
]);

let failures = 0;
const perProvider = new Map(PROVIDERS.map((provider) => [provider, { checks: 0, failures: 0 }]));
for (const file of files) {
  const { rows } = readCassette(join(VCR_DIR, file));
  for (const row of rows) {
    const adapter = adapters.get(row.adapterId);
    if (adapter === undefined) {
      console.log(`skip ${file}#${row.requestHash.slice(0, 8)}: no key for '${row.adapterId}'`);
      continue;
    }
    const label = `${file}#${row.requestHash.slice(0, 8)} (${row.adapterId}:${row.model})`;
    const lane = perProvider.get(row.adapterId);
    if (lane !== undefined) {
      lane.checks += 1;
    }
    try {
      let terminals = 0;
      let finish;
      for await (const event of adapter.stream(row.request)) {
        if (TERMINALS.has(event.type)) {
          terminals += 1;
          if (event.type === 'finish') {
            finish = event;
          }
        }
      }
      if (terminals !== 1) {
        throw new Error(`expected exactly one terminal event, saw ${terminals}`);
      }
      if (finish !== undefined) {
        if (!FINISH_REASONS.has(finish.finish.reason)) {
          throw new Error(`unknown finish reason '${finish.finish.reason}'`);
        }
        const u = finish.usage;
        if (u.inputTokens < u.cacheReadTokens + u.cacheWriteTokens) {
          throw new Error('Usage invariant violated: inputTokens < cacheRead + cacheWrite');
        }
      }
      console.log(`ok ${label}`);
    } catch (thrown) {
      failures += 1;
      if (lane !== undefined) {
        lane.failures += 1;
      }
      console.error(`DRIFT ${label}: ${thrown instanceof Error ? thrown.message : thrown}`);
    }
  }
}

// One row per provider lane (RV4306): a keyless lane is a named skip, a
// keyed lane with zero cassette rows is a named absence of fixtures,
// and a keyed lane that ran classifies by its own failure count. The
// job exit stays global, exactly as before.
for (const provider of PROVIDERS) {
  const lane = perProvider.get(provider) ?? { checks: 0, failures: 0 };
  if (!adapters.has(provider)) {
    record(provider, 'skipped-missing-secret', [
      '--detail',
      `${keyOf[provider]} absent from the environment`,
    ]);
  } else if (lane.checks === 0) {
    record(provider, 'skipped-no-fixtures', [
      '--detail',
      'no committed cassette rows address this adapter',
    ]);
  } else {
    record(provider, lane.failures > 0 ? 'failed' : 'passed', [
      '--checks',
      String(lane.checks),
      '--failures',
      String(lane.failures),
    ]);
  }
}

if (failures > 0) {
  console.error(
    `${failures} contract check(s) failed: provider drift or flaky surface (docs/11 5.3)`,
  );
  process.exit(1);
}
console.log('live adapter contract tests green');
