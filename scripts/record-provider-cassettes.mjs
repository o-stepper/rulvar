// Records the provider VCR cassettes that scripts/contract-tests.mjs
// re-sends against the LIVE APIs on the weekly cron. One deliberate local
// run per provider, keys from the environment (ANTHROPIC_API_KEY /
// OPENAI_API_KEY); a provider whose key is absent is skipped and can be
// recorded later without touching the others.
//
// Recording is DELIBERATE by construction: an existing cassette is never
// appended to or overwritten (a rerecord starts by deleting the file, so
// the diff review sees the whole new recording). The request set is the
// wire-contract surface the adapters own: a plain text turn, a forced
// tool call, a tool round-trip over engine-minted canonical ids, native
// structured output, an effort-bearing turn (thinking / reasoning
// retention), and, for Anthropic, a cache hint. Every request is small on
// purpose; the weekly cron re-sends exactly these, so this file is also
// the live-spend budget.
//
// The cassettes are NOT frozen fixtures: their bytes never enter replay
// identity, and check-frozen-fixtures.mjs excludes cassettes/vcr for
// exactly that reason. Secret redaction is applied by record() itself.
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = (name) => pathToFileURL(join(root, 'packages', name, 'dist', 'index.js')).href;

const { record } = await import(dist('testing'));

const VCR_DIR = join(root, 'cassettes', 'vcr');
mkdirSync(VCR_DIR, { recursive: true });

const msg = (role, text) => ({ role, parts: [{ type: 'text', text }] });

/** Strict-compatible everywhere: additionalProperties false, all required. */
const GET_TIME = {
  name: 'get_time',
  description: 'Returns the current time in the given IANA timezone.',
  parameters: {
    type: 'object',
    properties: { timezone: { type: 'string' } },
    required: ['timezone'],
    additionalProperties: false,
  },
};

const ANSWER_SCHEMA = {
  type: 'object',
  properties: { answer: { type: 'string' } },
  required: ['answer'],
  additionalProperties: false,
};

/**
 * The shared surface, per provider: the model differs, the shapes do not.
 * The tool round-trip uses a fixed canonical id; each adapter fabricates
 * its own wire id (toolu_* / call_*) from it, which is precisely the
 * bijection the contract run must keep exercising.
 */
function requestsFor(model, { cacheHint }) {
  const requests = [
    [
      'text turn',
      {
        model,
        messages: [msg('system', 'You answer with a single word.'), msg('user', 'Say ok.')],
        maxOutputTokens: 64,
      },
    ],
    [
      'forced tool call',
      {
        model,
        messages: [msg('user', 'What time is it in Paris?')],
        tools: [GET_TIME],
        toolChoice: { name: 'get_time' },
        maxOutputTokens: 256,
      },
    ],
    [
      'tool round-trip',
      {
        model,
        messages: [
          msg('user', 'What time is it in Paris? Answer in one short sentence.'),
          {
            role: 'assistant',
            parts: [
              {
                type: 'tool-call',
                id: 'vcrtool0001',
                name: 'get_time',
                args: { timezone: 'Europe/Paris' },
              },
            ],
          },
          {
            role: 'tool',
            parts: [
              {
                type: 'tool-result',
                id: 'vcrtool0001',
                name: 'get_time',
                result: { time: '14:00' },
              },
            ],
          },
        ],
        tools: [GET_TIME],
        maxOutputTokens: 128,
      },
    ],
    [
      'native structured output',
      {
        model,
        messages: [msg('user', 'Return the single word "yes" as the answer.')],
        schema: ANSWER_SCHEMA,
        maxOutputTokens: 128,
      },
    ],
    [
      'effort turn (retention path)',
      {
        model,
        messages: [msg('user', 'Which number is larger, 17 or 71? Answer with the number only.')],
        effort: 'low',
        maxOutputTokens: 512,
      },
    ],
  ];
  if (cacheHint) {
    requests.push([
      'cache hint',
      {
        model,
        messages: [
          msg(
            'system',
            'You are a terse assistant. Answer with a single word and no punctuation. ' +
              'Never explain, never apologize, never add caveats, never restate the question.',
          ),
          msg('user', 'Say ok.'),
        ],
        cacheHint: { breakpoints: [{ after: 'system' }] },
        maxOutputTokens: 64,
      },
    ]);
  }
  return requests;
}

const PROVIDERS = [
  {
    key: 'ANTHROPIC_API_KEY',
    pkg: 'anthropic',
    factory: 'anthropic',
    model: 'claude-sonnet-5',
    cacheHint: true,
  },
  {
    key: 'OPENAI_API_KEY',
    pkg: 'openai',
    factory: 'openai',
    model: 'gpt-5.4-mini',
    cacheHint: false,
  },
];

let recordedAnything = false;
let failures = 0;

for (const provider of PROVIDERS) {
  if (!process.env[provider.key]) {
    console.log(`skip ${provider.pkg}: ${provider.key} is not in the environment`);
    continue;
  }
  const cassette = join(VCR_DIR, `${provider.pkg}.jsonl`);
  if (existsSync(cassette)) {
    console.error(
      `refusing to touch ${cassette}: it already exists. A rerecord is deliberate; ` +
        'delete the file first so the review diff shows the whole new recording.',
    );
    failures += 1;
    continue;
  }
  const mod = await import(dist(provider.pkg));
  const adapter = mod[provider.factory]();
  const [wrapped] = record({ adapters: [adapter], cassette });
  console.log(`recording ${provider.pkg} (${provider.model}) -> ${cassette}`);
  for (const [label, request] of requestsFor(provider.model, provider)) {
    let events = 0;
    let terminal = 'none';
    for await (const event of wrapped.stream(request)) {
      events += 1;
      if (event.type === 'finish') {
        terminal = `finish:${event.finish.reason}`;
      } else if (event.type === 'error') {
        terminal = `error:${event.error.message}`;
      }
    }
    const ok = terminal.startsWith('finish:');
    if (!ok) {
      failures += 1;
    }
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}: ${events} events, ${terminal}`);
  }
  recordedAnything = true;
}

if (failures > 0) {
  console.error(
    `\n${failures} problem(s): an error row must never be committed (the contract run ` +
      'would validate it as a legal terminal). Delete the affected cassette, fix, re-run.',
  );
  process.exit(1);
}
if (!recordedAnything) {
  console.log('nothing recorded: no provider keys in the environment');
  process.exit(0);
}
console.log('\nverify the recording live before committing: node scripts/contract-tests.mjs');
