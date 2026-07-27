// The engine work budget (the cycle 83 gate): a committed baseline of the
// WORK a fixed set of runs performs, plus a superlinear-scaling detector
// for the two paths whose past regressions were algorithmic.
//
// Why counts and not milliseconds: a wall-clock budget on a shared CI
// runner is noise, and a gate that cries wolf gets disabled. Every
// scenario here instead counts the units of work the engine actually
// performs through the PUBLIC seams a host can observe: journal appends,
// journal loads, provider stream dispatches, and emitted events. Those
// are deterministic to the unit, so the baseline is an exact match, and a
// change that doubles the journal writes per turn or re-dispatches a
// replayed call cannot pass without the diff being visible in this file's
// JSON.
//
// The scaling probe covers what counts cannot see. The v1.25.0 review
// found an O(N^2) event drain: same counts, quadratic time. So the last
// two scenarios measure per-unit time at two sizes in ONE process and
// compare the RATIO, which is machine independent (a slow runner slows
// both sides equally). The bound is deliberately loose: linear work
// stays near 1.0, the quadratic drain it is written against lands near
// the size factor.
//
// Offline by construction: FakeAdapter, InMemoryStore, no network, no
// keys, no clock in the baseline. Refreeze deliberately with --update
// after a change that legitimately moves the work.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = (name) => pathToFileURL(join(root, 'packages', name, 'dist', 'index.js')).href;
const BASELINE = join(root, 'scripts', 'perf-budget.json');

const { createEngine, defineWorkflow, InMemoryStore, tool } = await import(dist('core'));
const { FAKE_MODEL_REF, FakeAdapter } = await import(dist('testing'));

/** Wraps a journal store and counts the calls a run makes into it. */
function countingStore() {
  const inner = new InMemoryStore();
  const counts = { append: 0, load: 0 };
  return {
    counts,
    store: new Proxy(inner, {
      get(target, key, receiver) {
        const value = Reflect.get(target, key, receiver);
        if (typeof value !== 'function') {
          return value;
        }
        const bound = value.bind(target);
        if (key === 'append' || key === 'load') {
          return (...args) => {
            counts[key] += 1;
            return bound(...args);
          };
        }
        return bound;
      },
    }),
  };
}

/** Counts provider dispatches without changing what the adapter serves. */
function countingAdapter(agents) {
  const inner = new FakeAdapter({ agents });
  const counts = { stream: 0 };
  return {
    counts,
    adapter: {
      id: inner.id,
      provider: inner.provider,
      caps: (model) => inner.caps(model),
      stream(req, signal) {
        counts.stream += 1;
        return inner.stream(req, signal);
      },
    },
  };
}

const echoTool = tool({
  name: 'note',
  description: 'records a note',
  parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
  execute: ({ text }) => ({ noted: text }),
});

/**
 * A fixed shape: three sequential agent calls, one of them driving a tool
 * round trip. Counts every seam a turn touches.
 */
async function scenarioTurns() {
  const { store, counts: storeCounts } = countingStore();
  const { adapter, counts: adapterCounts } = countingAdapter({
    worker: [{ tool: 'note', args: { text: 'first' } }, 'noted once'],
    '*': 'plain answer',
  });
  const engine = createEngine({
    adapters: [adapter],
    stores: { journal: store },
    defaults: {
      routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF },
      profiles: { worker: { tools: [echoTool] } },
    },
  });
  const wf = defineWorkflow({ name: 'turns' }, async (ctx) => {
    const a = await ctx.agent('plain one');
    const b = await ctx.agent('tool round trip', { agentType: 'worker' });
    const c = await ctx.agent('plain two');
    return [a, b, c].join(' | ');
  });
  let events = 0;
  const handle = engine.run(wf, null, { runId: 'perf-turns' });
  const drain = (async () => {
    for await (const _event of handle.events) {
      events += 1;
    }
  })();
  const outcome = await handle.result;
  await drain;
  if (outcome.status !== 'ok') {
    throw new Error(`perf scenario 'turns' did not settle ok: ${JSON.stringify(outcome.error)}`);
  }
  return {
    journalAppends: storeCounts.append,
    journalLoads: storeCounts.load,
    providerDispatches: adapterCounts.stream,
    events,
  };
}

/**
 * The never-pay-twice invariant as a budget: a resumed segment must
 * re-dispatch NOTHING. A regression that re-runs one memoized call is a
 * paid regression, and it shows here as a nonzero dispatch count.
 */
async function scenarioResume() {
  const { store } = countingStore();
  const first = countingAdapter({ '*': 'answer' });
  const engineA = createEngine({
    adapters: [first.adapter],
    stores: { journal: store },
    defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
  });
  const wf = defineWorkflow({ name: 'gated' }, async (ctx) => {
    const seen = await ctx.agent('before the gate');
    await ctx.awaitExternal('gate');
    return `${seen}, resumed`;
  });
  const handle = engineA.run(wf, null, { runId: 'perf-resume' });
  const suspended = await handle.result;
  if (suspended.status !== 'suspended') {
    throw new Error("perf scenario 'resume' did not suspend");
  }
  await handle.resolveExternal('gate', { ok: true });

  const second = countingAdapter({ '*': 'answer' });
  const engineB = createEngine({
    adapters: [second.adapter],
    stores: { journal: store },
    defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
  });
  const resumed = await engineB.resume('perf-resume', wf).result;
  if (resumed.status !== 'ok') {
    throw new Error(`perf scenario 'resume' did not settle ok: ${JSON.stringify(resumed.error)}`);
  }
  return {
    firstSegmentDispatches: first.counts.stream,
    resumedSegmentDispatches: second.counts.stream,
  };
}

/**
 * The event drain at two sizes. The v1.25.0 review found an O(N^2) drain:
 * identical counts, quadratic time, so only a timing shape can see it.
 * Setup stays outside the measured closure.
 */
function prepareEventDrain(size) {
  const engine = createEngine({
    adapters: [new FakeAdapter({ agents: { '*': 'done' } })],
    stores: { journal: new InMemoryStore() },
    defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
  });
  const wf = defineWorkflow({ name: 'burst' }, async (ctx, args) => {
    for (let i = 0; i < args.events; i += 1) {
      ctx.log('info', `event ${i}`);
    }
    return 'burst done';
  });
  let run = 0;
  return () =>
    (async () => {
      run += 1;
      const handle = engine.run(wf, { events: size }, { runId: `perf-burst-${size}-${run}` });
      let seen = 0;
      const drain = (async () => {
        for await (const _event of handle.events) {
          seen += 1;
        }
      })();
      await handle.result;
      await drain;
      if (seen < size) {
        throw new Error(`perf drain saw ${seen} events, expected at least ${size}`);
      }
    })();
}

/**
 * The replay fold on the resume hot path: a journal of N step entries is
 * folded and matched with ZERO provider dispatches. Expected linear in
 * the entry count; the setup run is deliberately outside the measurement.
 */
async function prepareReplayFold(size) {
  const store = new InMemoryStore();
  const engineOf = () =>
    createEngine({
      adapters: [new FakeAdapter({ agents: { '*': 'answer' } })],
      stores: { journal: store },
      defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
    });
  const wf = defineWorkflow({ name: 'stepped' }, async (ctx, args) => {
    for (let i = 0; i < args.steps; i += 1) {
      await ctx.step(`s${i}`, () => i);
    }
    await ctx.awaitExternal('gate');
    return 'stepped done';
  });
  const runId = `perf-replay-${size}`;
  const handle = engineOf().run(wf, { steps: size }, { runId });
  const suspended = await handle.result;
  if (suspended.status !== 'suspended') {
    throw new Error(`perf replay setup did not suspend at size ${size}`);
  }
  await handle.resolveExternal('gate', { ok: true });
  return () =>
    (async () => {
      // Arguments are never journaled: a resume re-binds them (the
      // documented same-args rule).
      const outcome = await engineOf().resume(runId, wf, { args: { steps: size } }).result;
      if (outcome.status !== 'ok' && outcome.status !== 'suspended') {
        throw new Error(`perf replay did not settle at size ${size}: ${outcome.status}`);
      }
    })();
}

const SMALL = 500;
const LARGE = 2_000;
/**
 * The per-unit slowdown a 4x size increase may show. Linear work lands
 * near 1.0; the quadratic drain this is written against lands near 4.
 * Three leaves generous headroom for a noisy shared runner while still
 * failing an order-of-growth change.
 */
const MAX_PER_UNIT_GROWTH = 3;

/** Best of three: the minimum is the least noisy estimator available. */
async function bestOfThree(prepare, size) {
  let best = Infinity;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const timed = await prepare(size);
    const started = process.hrtime.bigint();
    await timed();
    best = Math.min(best, Number(process.hrtime.bigint() - started) / 1e6);
  }
  return best;
}

async function scaling(label, prepare, small, large) {
  const smallMs = await bestOfThree(prepare, small);
  const largeMs = await bestOfThree(prepare, large);
  const perUnitSmall = smallMs / small;
  const perUnitLarge = largeMs / large;
  const growth = perUnitSmall === 0 ? 1 : perUnitLarge / perUnitSmall;
  return {
    label,
    smallMs: Number(smallMs.toFixed(2)),
    largeMs: Number(largeMs.toFixed(2)),
    growth: Number(growth.toFixed(2)),
  };
}

const update = process.argv.includes('--update');
const measured = {
  turns: await scenarioTurns(),
  resume: await scenarioResume(),
};
const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));

const failures = [];
for (const [scenario, counts] of Object.entries(measured)) {
  const expected = baseline.scenarios?.[scenario];
  if (expected === undefined) {
    failures.push(`scenario '${scenario}' has no committed baseline`);
    continue;
  }
  for (const [unit, value] of Object.entries(counts)) {
    if (expected[unit] !== value) {
      failures.push(
        `${scenario}.${unit}: ${String(value)} (baseline ${String(expected[unit])}); the engine ` +
          'changed how much work this run performs',
      );
    }
  }
}

const growths = [
  await scaling('event-drain', prepareEventDrain, SMALL, LARGE),
  await scaling('replay-fold', prepareReplayFold, SMALL / 4, LARGE / 4),
];
for (const probe of growths) {
  console.log(
    `[perf-budget] ${probe.label}: ${String(probe.smallMs)} ms small, ` +
      `${String(probe.largeMs)} ms large, per-unit growth ${String(probe.growth)}x`,
  );
  if (probe.growth > MAX_PER_UNIT_GROWTH) {
    failures.push(
      `${probe.label}: per-unit cost grew ${String(probe.growth)}x across a 4x size increase ` +
        `(ceiling ${String(MAX_PER_UNIT_GROWTH)}x); the path is no longer linear`,
    );
  }
}

console.log(`[perf-budget] work units: ${JSON.stringify(measured)}`);

if (update) {
  writeFileSync(
    BASELINE,
    `${JSON.stringify({ comment: baseline.comment, scenarios: measured }, null, 2)}\n`,
    'utf8',
  );
  console.log('[perf-budget] baseline refrozen');
  process.exit(0);
}

if (failures.length > 0) {
  console.error('[perf-budget] REGRESSION:');
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  console.error(
    'If the change is deliberate, refreeze with `node scripts/perf-budget.mjs --update` and ' +
      'commit the diff.',
  );
  process.exit(1);
}
console.log('[perf-budget] within budget');
