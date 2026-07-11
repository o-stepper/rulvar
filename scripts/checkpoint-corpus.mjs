// The fixed eval corpus of the M12 measured-value checkpoint (M12-T01;
// OQ-09: >= 3 taskClasses, n >= 20 per cell, plus the seed half the
// sweep learns from; the seed/eval split prevents leakage). Fully
// deterministic: a seeded LCG varies template parameters, so the pool
// is byte-identical on every run and across machines.
//
// Three classes, mixed standard: extraction (structured pulls from
// prose), code-edit (verifiable outcomes of small code changes), and
// judging (verdicts over planted-correctness answers). Ten orchestrated
// cases drive criterion 2.

/** Deterministic LCG (Numerical Recipes constants). */
function lcg(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const pick = (rand, list) => list[Math.floor(rand() * list.length)];
const int = (rand, lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

const VENDORS = ['Northwind', 'Acme Systems', 'Globex', 'Initech', 'Umbra Labs', 'Vandelay'];
const CURRENCIES = ['USD', 'EUR', 'GBP'];
const NAMES = ['Elena Petrova', 'Marcus Chen', 'Aoife Byrne', 'Tomas Novak', 'Lina Haddad'];
const CITIES = ['Lisbon', 'Krakow', 'Osaka', 'Toronto', 'Tallinn'];
const SERVICES = ['billing', 'ingest', 'renderer', 'scheduler', 'gateway'];
const LEVELS = ['ERROR', 'WARN', 'INFO'];

const JSON_ONLY =
  'Answer with STRICT JSON only, no prose, no code fences, exactly the requested keys.';

function extractionCase(rand, index) {
  const kind = index % 3;
  if (kind === 0) {
    const vendor = pick(rand, VENDORS);
    const total = int(rand, 120, 98750) / 10;
    const currency = pick(rand, CURRENCIES);
    return {
      name: `extract-invoice-${String(index)}`,
      prompt:
        `Extract as JSON {"vendor": string, "total": number, "currency": string} from this ` +
        `text: "Invoice #${String(int(rand, 1000, 9999))} issued by ${vendor}. Amount due: ` +
        `${String(total)} ${currency}. Please settle within 30 days." ${JSON_ONLY}`,
      golden: { vendor, total, currency },
    };
  }
  if (kind === 1) {
    const name = pick(rand, NAMES);
    const city = pick(rand, CITIES);
    const email = `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`;
    return {
      name: `extract-contact-${String(index)}`,
      prompt:
        `Extract as JSON {"name": string, "email": string, "city": string} from: ` +
        `"Met ${name} at the ${city} meetup; reach them at ${email} for follow ups." ${JSON_ONLY}`,
      golden: { name, email, city },
    };
  }
  const level = pick(rand, LEVELS);
  const service = pick(rand, SERVICES);
  const code = int(rand, 400, 599);
  return {
    name: `extract-log-${String(index)}`,
    prompt:
      `Extract as JSON {"level": string, "code": number, "service": string} from this log ` +
      `line: "[${level}] service=${service} code=${String(code)} retrying upstream call". ${JSON_ONLY}`,
    golden: { level, code, service },
  };
}

function codeEditCase(rand, index) {
  const kind = index % 3;
  if (kind === 0) {
    const from = int(rand, 4, 7);
    const to = int(rand, 8, 12);
    const k = int(rand, 2, 5);
    const c = int(rand, 1, 9);
    let result = 0;
    for (let i = 0; i < to; i += 1) result += i * k + c;
    return {
      name: `codeedit-bound-${String(index)}`,
      prompt:
        `Here is a function:\n` +
        `function f() { let s = 0; for (let i = 0; i < ${String(from)}; i++) { s += i * ${String(k)} + ${String(c)}; } return s; }\n` +
        `Apply this edit: change the loop bound ${String(from)} to ${String(to)}. What does the ` +
        `edited f() return? Answer as JSON {"result": number}. ${JSON_ONLY}`,
      golden: { result },
    };
  }
  if (kind === 1) {
    const items = Array.from({ length: int(rand, 5, 8) }, () => int(rand, 1, 99));
    const dropIndex = int(rand, 1, items.length - 2);
    const edited = items.filter((_, i) => i !== dropIndex);
    const result = edited.reduce((a, b) => a + b, 0);
    return {
      name: `codeedit-splice-${String(index)}`,
      prompt:
        `Given const xs = [${items.join(', ')}]; the current code returns xs.reduce((a, b) => a + b, 0). ` +
        `Apply this edit: first remove the element at index ${String(dropIndex)} (splice one ` +
        `element), then sum. What does the edited code return? Answer as JSON {"result": number}. ${JSON_ONLY}`,
      golden: { result },
    };
  }
  const word = pick(rand, ['journal', 'cassette', 'ladder', 'budget', 'replay']);
  const start = int(rand, 1, 3);
  const end = start + int(rand, 2, 3);
  const repeated = int(rand, 2, 3);
  const result = word.slice(start, end).repeat(repeated);
  return {
    name: `codeedit-string-${String(index)}`,
    prompt:
      `The current code returns "${word}".slice(${String(start)}, ${String(end)}). Apply this ` +
      `edit: wrap the result in .repeat(${String(repeated)}). What string does the edited code ` +
      `return? Answer as JSON {"result": string}. ${JSON_ONLY}`,
    golden: { result },
  };
}

function judgingCase(rand, index) {
  const kind = index % 3;
  if (kind === 0) {
    const a = int(rand, 12, 97);
    const b = int(rand, 12, 97);
    const truth = a * b;
    const wrong = rand() < 0.5;
    const claimed = wrong ? truth + pick(rand, [-10, -2, 2, 10, a, -b]) : truth;
    return {
      name: `judge-arith-${String(index)}`,
      prompt:
        `A student claims that ${String(a)} * ${String(b)} = ${String(claimed)}. Judge the claim. ` +
        `Answer as JSON {"verdict": "correct" | "incorrect"}. ${JSON_ONLY}`,
      golden: { verdict: wrong ? 'incorrect' : 'correct' },
    };
  }
  if (kind === 1) {
    const word = pick(rand, ['deterministic', 'orchestration', 'escalation', 'provenance']);
    const truth = word.length;
    const wrong = rand() < 0.5;
    const claimed = wrong ? truth + pick(rand, [-2, -1, 1, 2]) : truth;
    return {
      name: `judge-length-${String(index)}`,
      prompt:
        `An answer states that the word "${word}" contains ${String(claimed)} letters. Judge it. ` +
        `Answer as JSON {"verdict": "correct" | "incorrect"}. ${JSON_ONLY}`,
      golden: { verdict: wrong ? 'incorrect' : 'correct' },
    };
  }
  const items = Array.from({ length: int(rand, 4, 6) }, () => int(rand, 10, 99));
  const truth = Math.max(...items);
  const wrong = rand() < 0.5;
  const claimed = wrong ? [...items].sort((x, y) => x - y)[items.length - 2] : truth;
  return {
    name: `judge-max-${String(index)}`,
    prompt:
      `For the list [${items.join(', ')}], an answer claims the maximum is ${String(claimed)}. ` +
      `Judge it. Answer as JSON {"verdict": "correct" | "incorrect"}. ${JSON_ONLY}`,
    golden: { verdict: wrong ? 'incorrect' : 'correct' },
  };
}

/** 30 deterministic cases per class; the first `seedCount` seed the sweep. */
export function buildCorpus({ seedCount = 10, evalCount = 20 } = {}) {
  const total = seedCount + evalCount;
  const classes = [
    ['extraction', extractionCase, 0x5eed01],
    ['code-edit', codeEditCase, 0x5eed02],
    ['judging', judgingCase, 0x5eed03],
  ];
  const seed = [];
  const evalHalf = [];
  for (const [taskClass, build, seedValue] of classes) {
    const rand = lcg(seedValue);
    for (let index = 0; index < total; index += 1) {
      const spec = build(rand, index);
      (index < seedCount ? seed : evalHalf).push({ taskClass, spec });
    }
  }
  return { seed, evalHalf };
}

/** 10 orchestrated criterion-2 tasks: hard judging items behind a spawn. */
export function buildOrchestratedSpecs() {
  const rand = lcg(0x5eed04);
  return Array.from({ length: 10 }, (_, index) => {
    const a = int(rand, 83, 97);
    const b = int(rand, 88, 99);
    const truth = a * b;
    const wrong = index % 2 === 0;
    const claimed = wrong ? truth + pick(rand, [-8, -4, 4, 8]) : truth;
    return {
      name: `orchestrated-judge-${String(index)}`,
      goal:
        `Spawn EXACTLY ONE worker agent to judge this claim, await it, then call finish with ` +
        `the worker's JSON verdict verbatim as the result. The claim: "${String(a)} * ${String(b)} ` +
        `= ${String(claimed)}". The worker must answer as JSON {"verdict": "correct" | "incorrect"} ` +
        `and you must finish with exactly that JSON object.`,
      golden: { verdict: wrong ? 'incorrect' : 'correct' },
    };
  });
}
