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
import { readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = (name) => pathToFileURL(join(root, 'packages', name, 'dist', 'index.js')).href;

const { readCassette } = await import(dist('testing'));

const VCR_DIR = join(root, 'cassettes', 'vcr');
if (!existsSync(VCR_DIR)) {
  console.log('no provider VCR cassettes committed yet (cassettes/vcr/); nothing to test');
  process.exit(0);
}
const files = readdirSync(VCR_DIR).filter((name) => name.endsWith('.jsonl'));
if (files.length === 0) {
  console.log('no provider VCR cassettes committed yet (cassettes/vcr/); nothing to test');
  process.exit(0);
}

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
for (const file of files) {
  const { rows } = readCassette(join(VCR_DIR, file));
  for (const row of rows) {
    const adapter = adapters.get(row.adapterId);
    if (adapter === undefined) {
      console.log(`skip ${file}#${row.requestHash.slice(0, 8)}: no key for '${row.adapterId}'`);
      continue;
    }
    const label = `${file}#${row.requestHash.slice(0, 8)} (${row.adapterId}:${row.model})`;
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
      console.error(`DRIFT ${label}: ${thrown instanceof Error ? thrown.message : thrown}`);
    }
  }
}

if (failures > 0) {
  console.error(
    `${failures} contract check(s) failed: provider drift or flaky surface (docs/11 5.3)`,
  );
  process.exit(1);
}
console.log('live adapter contract tests green');
