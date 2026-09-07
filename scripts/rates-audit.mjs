// Documented-rates drift audit (RV813): compares the committed pricing
// seeds against the provider documentation pages the caps tables cite
// as their source, so "the seed was verified by hand on a date in a
// comment" becomes a weekly repeatable check. Runs from the live
// contract workflow (weekly, non-blocking for merges); a divergence or
// a failed extraction turns that run red and pages via the existing
// drift issue. The audit NEVER rewrites a seed: a confirmed rate change
// ships as its own release with a changeset (the RV814 doctrine).
//
// The audit's boundary, stated where the code lives: it verifies
// DOCUMENTATION, not billing. The provider's documented table and the
// provider's invoice are different authorities; billing truth is
// established only by statement reconciliation
// (reconcileStatement, RV812) over saved per-request or per-category
// exports. In the twelfth comparison run the dashboard headline
// disagreed with the seed while the billing categories confirmed it to
// the cent: a documentation audit must never claim that verdict.
//
// Extraction is fail-closed: a page that stops matching the expected
// shape is a finding demanding a human, never a silent pass. The
// audited pages are exactly the ones the caps comments cite: the three
// GPT-5.6 sibling model pages and the Anthropic model pricing table.
// The pre-5.6 OpenAI rows cite no page and are deliberately not
// audited here.
//
// Since RV4918 the audit also judges the AGE of every audited row's
// ratesVerifiedAt stamp against MAX_STAMP_AGE_DAYS: a table whose
// numbers still match the page but whose stamp nobody renews is
// exactly what a strictPricing.maxRatesAgeDays host discards on the
// calendar (the Anthropic stamp sat at 2026-07-31 while the page's
// 2026-08-10 revision made the Sonnet 5 rate permanent, and the weekly
// comparison stayed green because no number moved). The clock lives
// HERE, in the scheduled run, never in a pull request job.
//
// Usage: node scripts/rates-audit.mjs  (packages must be built; the
// seeds are imported from dist like scripts/contract-tests.mjs).
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Markup to comparable text: script and style bodies dropped, tags
 * replaced by spaces, the entities these pages actually use decoded,
 * whitespace collapsed.
 * @param {string} html @returns {string}
 */
export function decodeHtmlText(html) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (whole, name) => named[name.toLowerCase()] ?? whole)
    .replace(/\s+/g, ' ')
    .trim();
}

/** @param {string} text @param {RegExp} pattern @returns {number | undefined} */
function firstNumber(text, pattern) {
  const match = pattern.exec(text);
  if (match === null) {
    return undefined;
  }
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Rates from an OpenAI per-model docs page (developers.openai.com): the
 * Metric/Price table rows `Input $N`, `Cached input $N`, `Output $N`,
 * the sentence `Cache writes are billed at Nx the uncached input token
 * rate`, and the long-context sentence `Prompts with >NK input tokens
 * are priced at Nx input and Nx output`. Input and output are the
 * minimum meaningful extraction; the write premium and the tier are
 * reported absent when their sentences are missing, and the comparator
 * decides whether absence diverges from the seed.
 * @param {string} text
 * @returns {{ ok: true, rates: Record<string, unknown> } | { ok: false, reason: string }}
 */
export function extractOpenAiModelRates(text) {
  const input = firstNumber(text, /(?<!Cached\s)\bInput\s*\$\s*([0-9]+(?:\.[0-9]+)?)/i);
  const output = firstNumber(text, /\bOutput\s*\$\s*([0-9]+(?:\.[0-9]+)?)/i);
  const cachedInput = firstNumber(text, /\bCached\s+input\s*\$\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (input === undefined || output === undefined) {
    return { ok: false, reason: 'no Input/Output metric rows found (page shape changed?)' };
  }
  const rates = { inputUsdPerMTok: input, outputUsdPerMTok: output };
  if (cachedInput !== undefined) {
    rates.cacheReadUsdPerMTok = cachedInput;
  }
  const writeMultiplier = firstNumber(
    text,
    /Cache writes are billed at\s*([0-9]+(?:\.[0-9]+)?)x the uncached input token rate/i,
  );
  if (writeMultiplier !== undefined) {
    rates.cacheWriteUsdPerMTok = writeMultiplier * input;
  }
  const tier =
    /Prompts with\s*>\s*([0-9,]+)(K?)\s*input tokens are priced at\s*([0-9]+(?:\.[0-9]+)?)x input and\s*([0-9]+(?:\.[0-9]+)?)x output/i.exec(
      text,
    );
  if (tier !== null) {
    const threshold = Number(tier[1].replace(/,/g, '')) * (tier[2] === '' ? 1 : 1_000);
    rates.tiers = [
      {
        aboveInputTokens: threshold,
        inputMultiplier: Number(tier[3]),
        outputMultiplier: Number(tier[4]),
      },
    ];
  }
  return { ok: true, rates };
}

/**
 * Rates from the Anthropic model pricing table
 * (platform.claude.com/docs/en/about-claude/pricing): the named model's
 * row read column by column. The window runs from the first occurrence
 * of the display name to the next model row, and the five `$N / MTok`
 * amounts are, in the table's published column order: base input, 5m
 * cache write, 1h cache write, cache read, output. First occurrence
 * wins deliberately: while the Sonnet 5 introductory rate had a
 * scheduled end the page listed two rows for it, the seed carried the
 * row in effect, and after a seed flip the audit paging on the stale
 * first row is the wanted behavior (a human confirms which row is in
 * force). A display name is matched as a whole name (RV4918): the page
 * lists `Claude Fable 5.1` before `Claude Fable 5`, and a prefix match
 * read the newer row's 0.025x cache read against the Fable 5 seed as
 * a drift that does not exist.
 * @param {string} text @param {string} displayName
 * @returns {{ ok: true, rates: Record<string, number> } | { ok: false, reason: string }}
 */
export function extractAnthropicModelRates(text, displayName) {
  // The display name appears outside the pricing table too (navigation,
  // notes, the batch table with its two amounts), so every occurrence
  // is tried in order and the first whose bounded window shows all five
  // amounts is the model pricing row. Windows that cannot are skipped;
  // when none qualifies the extraction fails closed with the best count
  // seen.
  let found = false;
  let best = 0;
  for (
    let start = text.indexOf(displayName);
    start !== -1;
    start = text.indexOf(displayName, start + 1)
  ) {
    // A digit or a dot right after the name continues a LONGER name
    // (`Claude Fable 5` inside `Claude Fable 5.1`): a different model.
    if (/[.\d]/u.test(text.charAt(start + displayName.length))) {
      continue;
    }
    found = true;
    let window = text.slice(start + displayName.length);
    const next = window.search(/Claude\s+(?:Fable|Mythos|Opus|Sonnet|Haiku)\s/);
    if (next !== -1) {
      window = window.slice(0, next);
    }
    const amounts = [];
    const amountPattern = /\$\s*([0-9]+(?:\.[0-9]+)?)\s*\/\s*MTok/g;
    for (
      let match = amountPattern.exec(window);
      match !== null;
      match = amountPattern.exec(window)
    ) {
      amounts.push(Number(match[1]));
      if (amounts.length === 5) {
        break;
      }
    }
    best = Math.max(best, amounts.length);
    if (amounts.length === 5) {
      return {
        ok: true,
        rates: {
          inputUsdPerMTok: amounts[0],
          cacheWriteUsdPerMTok: amounts[1],
          cacheWrite1hUsdPerMTok: amounts[2],
          cacheReadUsdPerMTok: amounts[3],
          outputUsdPerMTok: amounts[4],
        },
      };
    }
  }
  if (!found) {
    return { ok: false, reason: `model '${displayName}' not found on the page` };
  }
  return {
    ok: false,
    reason: `row for '${displayName}' shows ${String(best)} of the 5 amounts (page shape changed?)`,
  };
}

/**
 * The scheduled audit's re verification bound (RV4918), in days: a
 * seed row whose `ratesVerifiedAt` is older than this fails the audit
 * even when every documented number still matches. Sixty days, twice
 * the thirty day `strictPricing.maxRatesAgeDays` the conformance
 * journal declares: the audit is the reminder that a stamp must be
 * renewed by a human re read and a release, not the host's own gate.
 */
export const MAX_STAMP_AGE_DAYS = 60;

/**
 * The future tolerance mirrors the engine's RV1804 clamp: a date only
 * stamp authored ahead of UTC reads up to a day in the future, while a
 * typo'd year reads months out and is a finding.
 */
const FUTURE_STAMP_TOLERANCE_DAYS = 1;

/**
 * Judges the age of a seed row's verification stamp at `nowMs`
 * (RV4918): a finding string, or undefined when the stamp is fresh. A
 * missing or unparsable stamp is a finding too, never a pass.
 * @param {{ ratesVerifiedAt?: unknown } | undefined} seed
 * @param {number} nowMs
 * @param {number} [maxAgeDays]
 * @returns {string | undefined}
 */
export function judgeStampAge(seed, nowMs, maxAgeDays = MAX_STAMP_AGE_DAYS) {
  const stamp = seed?.ratesVerifiedAt;
  if (typeof stamp !== 'string') {
    return 'the seed row carries no ratesVerifiedAt stamp';
  }
  const verifiedMs = Date.parse(stamp);
  if (!Number.isFinite(verifiedMs)) {
    return `ratesVerifiedAt '${stamp}' is not a date`;
  }
  const ageDays = Math.floor((nowMs - verifiedMs) / 86_400_000);
  if (ageDays > maxAgeDays) {
    return (
      `ratesVerifiedAt ${stamp} is ${String(ageDays)} days old, past the ` +
      `${String(maxAgeDays)} day re verification bound: re read the documented page and ship ` +
      'the renewed stamp in a release (a stamp alone keeps pricingVersion; a moved rate is a ' +
      'new pricingVersion)'
    );
  }
  if (ageDays < -FUTURE_STAMP_TOLERANCE_DAYS) {
    return `ratesVerifiedAt ${stamp} is in the future; a verification cannot postdate the audit`;
  }
  return undefined;
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = (name) => pathToFileURL(join(root, 'packages', name, 'dist', 'index.js')).href;

async function main() {
  // The comparator lives at its published home, `@rulvar/core`
  // `compareRates` (RV909): the fault-injection kit drives it as a
  // permanent gate there and `packages/core/src/model/pricing.test.ts`
  // owns its unit tests, so this script imports the SAME function from
  // dist exactly like the seeds below (inside main, keeping the module
  // loadable by the dependency-free CI script tests), and the weekly
  // audit and the kit can never drift apart. Both directions (RV902): a
  // seed field the page no longer shows is drift, and a billable page
  // rate the seed never claimed is drift too, because a documented rate
  // missing from the seed is a silent underpricing channel (the 1h
  // write premium hid exactly there until RV810/RV901 made it billable
  // and seeded).
  const { compareRates } = await import(dist('core'));
  const { OPENAI_MODELS } = await import(dist('openai'));
  const { ANTHROPIC_MODELS } = await import(dist('anthropic'));

  const ANTHROPIC_PRICING_PAGE = 'https://platform.claude.com/docs/en/about-claude/pricing';
  const anthropicRow = (model, displayName) => ({
    provider: 'anthropic',
    model,
    url: ANTHROPIC_PRICING_PAGE,
    seed: ANTHROPIC_MODELS[model]?.caps.pricing,
    extract: (text) => extractAnthropicModelRates(text, displayName),
  });
  const openAiRow = (model) => ({
    provider: 'openai',
    model,
    url: `https://developers.openai.com/api/docs/models/${model}`,
    seed: OPENAI_MODELS[model]?.caps.pricing,
    extract: extractOpenAiModelRates,
  });
  const spec = [
    openAiRow('gpt-5.6-sol'),
    openAiRow('gpt-5.6-terra'),
    openAiRow('gpt-5.6-luna'),
    anthropicRow('claude-fable-5', 'Claude Fable 5'),
    anthropicRow('claude-opus-4-8', 'Claude Opus 4.8'),
    anthropicRow('claude-opus-4-7', 'Claude Opus 4.7'),
    anthropicRow('claude-sonnet-5', 'Claude Sonnet 5'),
    anthropicRow('claude-haiku-4-5', 'Claude Haiku 4.5'),
    anthropicRow('claude-opus-4-6', 'Claude Opus 4.6'),
    anthropicRow('claude-sonnet-4-6', 'Claude Sonnet 4.6'),
  ];

  const pages = new Map();
  const failures = [];
  const nowMs = Date.now();
  for (const row of spec) {
    if (row.seed === undefined) {
      failures.push(`${row.provider}:${row.model}: no priced seed row (the spec is stale)`);
      continue;
    }
    // The stamp's age is a finding of its own (RV4918), judged before
    // and independently of the page comparison: a row whose numbers
    // still match but whose stamp is past the bound fails the run.
    const stale = judgeStampAge(row.seed, nowMs);
    if (stale !== undefined) {
      failures.push(`${row.provider}:${row.model}: ${stale}`);
    }
    if (!pages.has(row.url)) {
      try {
        const response = await fetch(row.url, { redirect: 'follow' });
        if (!response.ok) {
          throw new Error(`HTTP ${String(response.status)}`);
        }
        pages.set(row.url, decodeHtmlText(await response.text()));
      } catch (error) {
        pages.set(row.url, { failed: error instanceof Error ? error.message : String(error) });
      }
    }
    const page = pages.get(row.url);
    if (typeof page !== 'string') {
      failures.push(`${row.provider}:${row.model}: fetch failed (${page.failed})`);
      continue;
    }
    const extracted = row.extract(page);
    if (!extracted.ok) {
      failures.push(`${row.provider}:${row.model}: ${extracted.reason}`);
      continue;
    }
    const findings = compareRates(row.seed, extracted.rates);
    if (findings.length > 0) {
      for (const finding of findings) {
        failures.push(`${row.provider}:${row.model}: ${finding}`);
      }
      continue;
    }
    console.log(`[rates-audit] ${row.provider}:${row.model}: documented rates match the seed`);
  }

  if (failures.length > 0) {
    console.error(`[rates-audit] ${String(failures.length)} finding(s):`);
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    console.error(
      '[rates-audit] the audit verifies DOCUMENTATION, never billing: billing truth is ' +
        'established by reconcileStatement (RV812) over saved exports, and a confirmed rate ' +
        'change ships as its own release with a changeset, never an automatic rewrite.',
    );
    process.exit(1);
  }
  console.log(
    `[rates-audit] all ${String(spec.length)} audited seed rows match their documented pages ` +
      `and carry a ratesVerifiedAt within ${String(MAX_STAMP_AGE_DAYS)} days`,
  );
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
