[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunBudget

# Class: RunBudget

Defined in: [packages/core/src/engine/budget.ts:212](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L212)

The per-run budget account tree. All spend accounting is per instance;
the journal remains the durable source (the root is seeded by the
ledger fold on resume, M2; sub-account reserves are recovered from
spawn-admission decision entries, M6).

## Constructors

### Constructor

```ts
new RunBudget(options): RunBudget;
```

Defined in: [packages/core/src/engine/budget.ts:287](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L287)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `ceilingUsd?`: `number`; `clampTurnToExposure?`: `boolean`; `events?`: [`RuntimeEventSink`](/api/@rulvar/core/interfaces/RuntimeEventSink.md); `lifetimeSpawnCap?`: `number`; `maxInFlightExposureUsd?`: `number`; `now?`: () => `number`; `priceUsd?`: (`servedBy`, `usage`) => `number` \| `undefined`; `pricingOf?`: (`servedBy`) => [`Pricing`](/api/@rulvar/core/interfaces/Pricing.md) \| `undefined`; `seed?`: \{ `accounts?`: `Readonly`\&lt;`Record`\&lt;`string`, `number`\&gt;\&gt;; `agentsSpawned`: `number`; `usage`: [`Usage`](/api/@rulvar/core/type-aliases/Usage.md); `usd`: `number`; \}; `strictPricing?`: \{ `allowUnpriced?`: readonly `string`[]; `maxRatesAgeDays?`: `number`; \}; \} | - |
| `options.ceilingUsd?` | `number` | - |
| `options.clampTurnToExposure?` | `boolean` | The opt-in lone-dispatch clamp (RV2503); see maxExposureOutputTokens. |
| `options.events?` | [`RuntimeEventSink`](/api/@rulvar/core/interfaces/RuntimeEventSink.md) | - |
| `options.lifetimeSpawnCap?` | `number` | - |
| `options.maxInFlightExposureUsd?` | `number` | The opt-in in-flight exposure cap (RV711); see reserveTurnExposure. |
| `options.now?` | () => `number` | Clock for the freshness bound; injectable for tests. |
| `options.priceUsd?` | (`servedBy`, `usage`) => `number` \| `undefined` | - |
| `options.pricingOf?` | (`servedBy`) => [`Pricing`](/api/@rulvar/core/interfaces/Pricing.md) \| `undefined` | Raw price-row resolution for the layer-2b output bound. |
| `options.seed?` | \{ `accounts?`: `Readonly`\&lt;`Record`\&lt;`string`, `number`\&gt;\&gt;; `agentsSpawned`: `number`; `usage`: [`Usage`](/api/@rulvar/core/type-aliases/Usage.md); `usd`: `number`; \} | The resume seed, folded from the persisted journal (the settled per-call fold, RV801): spend is never reset and never double-counted; replayed entries are already inside this seed and add no increments. `accounts` carries the per-account rows of the same fold (`accountSpendFromJournal`, RV1505): each scope's INCLUSIVE settled spend, applied when the scope re-opens, so sub-account history survives resume instead of restarting at zero. The root row is ignored: the root seeds from `usd`, which is the same settled fold by construction. Orchestrator-cap accounts are exempt (see openAccount): the cap is a per-segment coordination bound and the documented resume after a budget-cancelled root continues past it by design. |
| `options.seed.accounts?` | `Readonly`\&lt;`Record`\&lt;`string`, `number`\&gt;\&gt; | - |
| `options.seed.agentsSpawned` | `number` | - |
| `options.seed.usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - |
| `options.seed.usd` | `number` | - |
| `options.strictPricing?` | \{ `allowUnpriced?`: readonly `string`[]; `maxRatesAgeDays?`: `number`; \} | The strict pre-egress pricing gate (RV1508): armed, every paid dispatch must resolve a well-formed price row for its serving model BEFORE the wire call, or the dispatch refuses typed. See [RunBudget.assertPricedDispatch](/api/@rulvar/core/classes/RunBudget.md#assertpriceddispatch) for the exact refusals. Absent by default: the surface is inert and dispatch behavior is byte identical. |
| `options.strictPricing.allowUnpriced?` | readonly `string`[] | - |
| `options.strictPricing.maxRatesAgeDays?` | `number` | - |

#### Returns

`RunBudget`

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-ceilingusd"></a> `ceilingUsd?` | `readonly` | `number` | B0; immutable within a segment (RV2511): only the explicit, journaled ResumeOptions.run override (RV2208) changes it, by opening a new segment, and budgetPolicy 'immutable-lifetime' (RV3902) refuses even that. Undefined means no USD ceiling. | [packages/core/src/engine/budget.ts:219](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L219) |
| <a id="property-maxinflightexposureusd"></a> `maxInFlightExposureUsd?` | `readonly` | `number` | The opt-in in-flight exposure cap (RV711). Undefined means the reservation surface is inert and reserveTurnExposure never binds. | [packages/core/src/engine/budget.ts:224](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L224) |
| <a id="property-strictpricing"></a> `strictPricing?` | `readonly` | \{ `allowUnpriced?`: readonly `string`[]; `maxRatesAgeDays?`: `number`; \} | The strict pre-egress pricing gate config (RV1508); undefined means the surface is inert and [assertPricedDispatch](/api/@rulvar/core/classes/RunBudget.md#assertpriceddispatch) never binds. | [packages/core/src/engine/budget.ts:240](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L240) |
| `strictPricing.allowUnpriced?` | `public` | readonly `string`[] | - | [packages/core/src/engine/budget.ts:240](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L240) |
| `strictPricing.maxRatesAgeDays?` | `public` | `number` | - | [packages/core/src/engine/budget.ts:240](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L240) |

## Accessors

### committedReserveUsd

#### Get Signature

```ts
get committedReserveUsd(): number;
```

Defined in: [packages/core/src/engine/budget.ts:799](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L799)

##### Returns

`number`

***

### exhausted

#### Get Signature

```ts
get exhausted(): boolean;
```

Defined in: [packages/core/src/engine/budget.ts:785](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L785)

##### Returns

`boolean`

***

### liveExposureHolderCount

#### Get Signature

```ts
get liveExposureHolderCount(): number;
```

Defined in: [packages/core/src/engine/budget.ts:1322](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L1322)

Live exposure holders: agents with a nonzero held balance (RV2001).
Zero with live waiters means nothing can ever release, the drained
signal the quiescence machinery keys on.

##### Returns

`number`

***

### liveExposureUsd

#### Get Signature

```ts
get liveExposureUsd(): number;
```

Defined in: [packages/core/src/engine/budget.ts:1327](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L1327)

Live in-flight exposure currently held by open dispatches (RV1902).

##### Returns

`number`

***

### signal

#### Get Signature

```ts
get signal(): AbortSignal;
```

Defined in: [packages/core/src/engine/budget.ts:776](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L776)

Layer 3 ceiling signal of the run root; live streams sever through it.

##### Returns

`AbortSignal`

***

### spawnHeadroom

#### Get Signature

```ts
get spawnHeadroom(): number;
```

Defined in: [packages/core/src/engine/budget.ts:804](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L804)

Spawn headroom under the engine lifetime cap (embedded in admission verdicts).

##### Returns

`number`

## Methods

### accountView()

```ts
accountView(scope): 
  | BudgetAccountView
  | undefined;
```

Defined in: [packages/core/src/engine/budget.ts:701](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L701)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | `string` |

#### Returns

  \| [`BudgetAccountView`](/api/@rulvar/core/interfaces/BudgetAccountView.md)
  \| `undefined`

***

### admitRecovered()

```ts
admitRecovered(reserveUsd, accountScope?): void;
```

Defined in: [packages/core/src/engine/budget.ts:939](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L939)

Resume roll-forward: commits a reserve recovered from a journaled
spawn-admission decision entry without re-evaluating admission
(reserves are recovered, never re-estimated). The lifetime spawn
counter does NOT increment here (RV2201): every agent the
roll-forward re-covers already counted through the resume seed,
whose journal fold counts each dispatched agent entry, so an
incrementing roll-forward double-counts every recovered child.
The seventh subscription parity run resumed a killed 4-child
fan-out into a seed of 5, re-counted the children to 9 against a
cap of 8, and the post-acceptance tail starved on the counter
while the synthesis reserve's money sat whole: the judge declined
typed, the synthesis spawn refusal reached the terminal, and the
accepted dossier was lost. Each spawned agent counts a single
time across the run's whole life, never twice: at its fresh
admitSpawn, or through the seed of whichever segment rolls it
forward.

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `reserveUsd` | `number` | `undefined` |
| `accountScope` | `string` | `ROOT_ACCOUNT` |

#### Returns

`void`

***

### admitSpawn()

```ts
admitSpawn(reserveUsd, accountScope?): void;
```

Defined in: [packages/core/src/engine/budget.ts:912](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L912)

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `reserveUsd` | `number` | `undefined` |
| `accountScope` | `string` | `ROOT_ACCOUNT` |

#### Returns

`void`

***

### allowanceHeadroomOf()

```ts
allowanceHeadroomOf(scope): number | undefined;
```

Defined in: [packages/core/src/engine/budget.ts:757](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L757)

The tightest allowance headroom on the chain of `scope`: the minimum
remainder across 'child-allowance' accounts. An allowance ceiling
bounds the child's LIFETIME spend, so projected admission must never
hold more than this against the chain (the layer-2 mirror lives in
the orchestrator admission's childCeiling clamp): a reserve above
the allowance would deny work that the allowance itself already
bounds. Undefined when no allowance account is on the chain; the
clamp never applies to the run root or an orchestrator cap, whose
headroom is shared money that projected admission must protect.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | `string` |

#### Returns

`number` \| `undefined`

***

### assertPricedDispatch()

```ts
assertPricedDispatch(servedBy): void;
```

Defined in: [packages/core/src/engine/budget.ts:602](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L602)

The strict pre-egress pricing gate (RV1508): called at the dispatch
chokepoint, strictly BEFORE the wire call and before any exposure
hold, whenever `strictPricing` is armed. Refusals, each a typed
ConfigError naming the model and the defect: no price row resolves
(an unpriced model debits nothing, so every ceiling silently fails
to bound it); a row missing its required input or output rate
(RV3204: the type requires both, and an untyped `{}` row used to
satisfy every conditional check and debit zero); a malformed row
(a non-finite or negative rate, a
malformed long-context tier), because arithmetic over it disarms
the very comparisons the mode exists to keep honest; and, only
when `maxRatesAgeDays` is declared, a row whose `ratesVerifiedAt`
is absent, unparsable, or older than the bound, because a stale
price bounds the ceiling with yesterday's truth. `allowUnpriced`
is the explicit exception for models the host KNOWS are free
(exact refs, no patterns). A model is vetted once per run: the
price table is fixed for the run's life, so the verdict cannot
drift between turns. Inert without the config, byte for byte.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `servedBy` | `` `${string}:${string}` `` |

#### Returns

`void`

***

### awaitExposureRelease()

```ts
awaitExposureRelease(signal?): Promise<"aborted" | "released" | "drained">;
```

Defined in: [packages/core/src/engine/budget.ts:1341](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L1341)

Parks until the NEXT in-flight exposure hold releases (RV1902):
resolves 'released' on that wake, 'drained' immediately when no
hold is live (there is nothing to wait out, so the caller's refusal
is terminal for its turn), and 'aborted' when the signal fires
first. The waiter registers BEFORE any check, so a release racing
the caller's refusal is never lost; spend never shrinks, so
releases are the only wake source that can turn a refusal into a
fit.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `signal?` | `AbortSignal` |

#### Returns

`Promise`\&lt;`"aborted"` \| `"released"` \| `"drained"`\&gt;

***

### beforeTurn()

```ts
beforeTurn(accountScope?): void;
```

Defined in: [packages/core/src/engine/budget.ts:1371](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L1371)

Layer 2: the per-turn guard. A turn that would cross any ceiling in the chain is not dispatched.

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `accountScope` | `string` | `ROOT_ACCOUNT` |

#### Returns

`void`

***

### commitConvergenceReserve()

```ts
commitConvergenceReserve(scope, reserveUsd): void;
```

Defined in: [packages/core/src/engine/budget.ts:1044](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L1044)

Registers the repair round's verdict reserve (RV3701, the third
comparison experiment's arc): absolute dollars held on the
orchestrator account AND the run root for the verdict pass (the
round's second judge invocation) that must follow a DISPATCHED
claim repair round. The third comparison run
proved the round's two invocation tail is only as convergent as
the money left when the candidate materializes; with the verdict
money held from the moment the round is admitted, the round's own
repair turns (the layer-2b clamp prices output from a remainder
this hold shrinks) and any concurrent admission (the hold joins
the projected admission sum) cannot eat it, so a round the budget
can only START is refused before any wire call instead of being
paid for and left unjudgeable. Exactly the synthesis reserve
mechanics: released to the invocation it was held FOR (the
verdict pass dispatch), never joined to the severing check.
Idempotent per account: registering again adjusts the root by the
delta.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | `string` |
| `reserveUsd` | `number` |

#### Returns

`void`

***

### commitFinalizeReserve()

```ts
commitFinalizeReserve(scope, reserveUsd): void;
```

Defined in: [packages/core/src/engine/budget.ts:954](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L954)

Registers the orchestrator finalize reserve (DEF-7):
absolute dollars set on the named account AND the run root, so
admission never lets any spawn eat the finalization money even
against whole-run exhaustion. Kept SEPARATE from committedReserveUsd
(the block checks add both), so remainders never double-count.
Idempotent: re-registering on resume keeps the journaled amount.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | `string` |
| `reserveUsd` | `number` |

#### Returns

`void`

***

### commitRepairReserve()

```ts
commitRepairReserve(scope, reserveUsd): void;
```

Defined in: [packages/core/src/engine/budget.ts:1093](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L1093)

Registers the repair round's MECHANICAL leg (RV3802), the money
twin of the RV3602 per-invocation pool: the round's finish
contract can grant one bounded mechanical repair turn, and the
third comparison run's round entered exactly that turn's price
short of certainty (the repair existed by pool and by contract,
but nothing guaranteed the money would still be there when the
candidate materialized). Held beside the verdict leg from the
moment the round is admitted; released EARLY, to the round's own
finish loop, at its first journaled verdict (a 'repair' verdict is
about to spend the freed money on the granted turn, an 'accepted'
one never needed it), where the verdict leg lives until the judge
dispatch. Exactly the convergence reserve mechanics otherwise:
joins the projected admission sum and both remainders, named in
the refusal clause, never joined to the severing check, idempotent
per account with the root adjusted by the delta.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | `string` |
| `reserveUsd` | `number` |

#### Returns

`void`

***

### commitSynthesisReserve()

```ts
commitSynthesisReserve(scope, reserveUsd): void;
```

Defined in: [packages/core/src/engine/budget.ts:993](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L993)

Registers the synthesis payload reserve (the sixth comparison
experiment, cycle 76): absolute dollars held on the orchestrator
account AND the run root, so neither spawn admission nor the
per-turn output clamp lets the coordination prefix eat the money
the synthesis finish needs. Unlike the finalize reserve it is
released BEFORE the synthesis invocation dispatches (the held
money is exactly what that invocation is meant to spend), and it
never joins the severing check: a coordination running against the
hold is clamped smaller, never aborted. Idempotent per account:
re-registering adjusts the root by the delta.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | `string` |
| `reserveUsd` | `number` |

#### Returns

`void`

***

### exhaustionDiagnostics()

```ts
exhaustionDiagnostics(scope): BudgetExhaustionDiagnostics;
```

Defined in: [packages/core/src/engine/budget.ts:544](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L544)

The diagnostic projection behind a ceiling error: the first CLOSED
account (projected commitments included, exactly the layer-1
closure test) walking from `scope` toward the root, plus the root
state. 'run budget ceiling reached' under a healthy root misled the
v1.6.0 follow-up review's live probe when only a 0.18 USD
orchestrator cap had crossed under a 0.90 USD root; the message can
now name the account that actually ended the work. An unknown scope
degrades to root-only diagnostics instead of throwing: this runs on
the error path.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | `string` |

#### Returns

[`BudgetExhaustionDiagnostics`](/api/@rulvar/core/interfaces/BudgetExhaustionDiagnostics.md)

***

### markExhausted()

```ts
markExhausted(): void;
```

Defined in: [packages/core/src/engine/budget.ts:794](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L794)

Marks the run exhausted without a ceiling event: the orchestrator
finalize fallback maps to outcome 'exhausted' with the synthesized
partial value (DEF-7; exhaustion is never null).

#### Returns

`void`

***

### maxAffordableOutputTokens()

```ts
maxAffordableOutputTokens(
   servedBy, 
   estimatedInputTokens, 
   accountScope?): number | undefined;
```

Defined in: [packages/core/src/engine/budget.ts:1426](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L1426)

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `servedBy` | `` `${string}:${string}` `` | `undefined` |
| `estimatedInputTokens` | `number` | `undefined` |
| `accountScope` | `string` | `ROOT_ACCOUNT` |

#### Returns

`number` \| `undefined`

***

### maxExposureOutputTokens()

```ts
maxExposureOutputTokens(servedBy, estimatedInputTokens): number | undefined;
```

Defined in: [packages/core/src/engine/budget.ts:1488](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L1488)

The same layer-2b question asked of the IN-FLIGHT EXPOSURE ceiling
(RV2503): the output tokens `cap - spent - live estimates` still
affords from `servedBy` for an estimated prompt, priced by the
settlement function like every other estimate here.

The clamp above has always existed for the budget ceiling while
[reserveTurnExposure](/api/@rulvar/core/classes/RunBudget.md#reserveturnexposure) only ever answered yes or no, so a
turn whose FULL planned output overshot the exposure line was
refused outright even when a shorter one fit and the budget could
pay for it. The 1.226.0 comparison run died exactly there: it held
0.8642 USD of budget, the exposure ceiling had 0.5642 USD of room,
the mandatory repair turn was estimated at 0.7066 USD against an
18000 token output plan, and the dispatch was refused before any
provider call. The same turn, re-issued after the operator raised
the ceiling, wrote 12840 output tokens and cost 0.4788 USD: it fit
the ceiling that refused it, and a clamp to the ~13253 tokens the
room afforded would have let it run.

Answered ONLY for a dispatch that is alone in flight, which is the
whole difference between a refusal that means something and one
that means nothing. With siblings live the refusal is TRANSIENT:
RV1902 parks on it and the turn runs at its full planned length
the moment one of them releases, so shortening it would trade a
complete answer for a truncated one and buy nothing. With nothing
live the refusal is PERMANENT (RV2003's sweep wakes such a waiter
'drained' precisely because no hold will ever return), and the
only choices left are a shorter turn or no turn at all. The
concurrent-wave bound of RV711 is therefore untouched.

Opt-in through `RunOptions.clampTurnToExposure`, so the drained
refusal terminals RV1902, RV2002 and RV2003 built out of live
parity deaths keep their shapes until a host asks for this one.

Undefined when the clamp is not armed, when the cap is not
configured, when anything is in flight, or when the model has no
price row, so a run that declares nothing keeps every byte of its
historical path. Zero or
negative when the room cannot even pay for the prompt, the same
convention [maxAffordableOutputTokens](/api/@rulvar/core/classes/RunBudget.md#maxaffordableoutputtokens) inherits from
`affordableOutputTokens`; the caller decides what a sub-floor
answer means, and the loop deliberately ignores one so a true
exposure exhaustion still refuses through
[reserveTurnExposure](/api/@rulvar/core/classes/RunBudget.md#reserveturnexposure) with its own typed reason instead of
an output-floor verdict.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `servedBy` | `` `${string}:${string}` `` |
| `estimatedInputTokens` | `number` |

#### Returns

`number` \| `undefined`

***

### onUsage()

```ts
onUsage(
   usage, 
   servedBy, 
   accountScope?): void;
```

Defined in: [packages/core/src/engine/budget.ts:1507](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L1507)

Live accounting; spend propagates from `accountScope` to every
ancestor. Crossing a ceiling severs the crossing account's subtree
via its layer-3 AbortSignal (overshoot bounded by one turn per
in-flight agent; providers bill severed streams).

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | `undefined` |
| `servedBy` | `` `${string}:${string}` `` | `undefined` |
| `accountScope` | `string` | `ROOT_ACCOUNT` |

#### Returns

`void`

***

### openAccount()

```ts
openAccount(scope, options): void;
```

Defined in: [packages/core/src/engine/budget.ts:458](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L458)

Opens a child sub-account under `parentScope`.
Re-opening an existing scope is the resume roll-forward path: the
recorded ceiling wins once and the accumulated state is kept.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | `string` |
| `options` | \{ `ceilingUsd?`: `number`; `finalizeReserveUsd?`: `number`; `kind?`: `"orchestrator-cap"` \| `"child-allowance"`; `parentScope?`: `string`; \} |
| `options.ceilingUsd?` | `number` |
| `options.finalizeReserveUsd?` | `number` |
| `options.kind?` | `"orchestrator-cap"` \| `"child-allowance"` |
| `options.parentScope?` | `string` |

#### Returns

`void`

***

### openCallMeter()

```ts
openCallMeter(servedBy, accountScope?): (delta) => void;
```

Defined in: [packages/core/src/engine/budget.ts:1543](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L1543)

The per-call marginal meter (RV1101). One meter covers ONE provider
call (the settled fold's billing basis, RV801): the loop feeds it
every mid-stream delta and the settle remainder of that call, and
each feeding debits the INCREMENT of the call's accumulated price
over what the call already paid, never the slice priced alone. The
telescoping sum equals the price of the call's total usage for any
pricing shape, so a long-context tier crossed by the accumulation
mid-call debits the retroactive re-price of the whole call at the
crossing slice, exactly the dollars settlement will record;
per-slice pricing could never see that crossing (no single slice
crosses the threshold, RV1101). A negative increment (a price
function that shrinks as usage grows) clamps to zero: a debit
never credits, spend stays monotone. Unpriced models and invalid
price results debit zero through the same once-per-model warnings
as onUsage. The tier still never fires on a run aggregate no
single call crossed: each call opens its own meter (RV504).

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `servedBy` | `` `${string}:${string}` `` | `undefined` |
| `accountScope` | `string` | `ROOT_ACCOUNT` |

#### Returns

(`delta`) => `void`

***

### raiseChildAllowance()

```ts
raiseChildAllowance(scope, byUsd): void;
```

Defined in: [packages/core/src/engine/budget.ts:518](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L518)

Raises a child-allowance ceiling by one more admitted child's
declared estimate (RV4404, `budget.estIsCeiling`). Tool-spawned
children of one orchestrator share a scope, so the enforced bound
is the AGGREGATE of the declared estimates: the fan-out
collectively cannot spend past what it declared, which is exactly
the number the acceptance-tail arithmetic trusted. Only a
child-allowance account may raise; the orchestrator cap and the
root are host declarations no admission may widen. Deterministic
on resume: admissions replay in order, so the raises do too.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | `string` |
| `byUsd` | `number` |

#### Returns

`void`

***

### refuseSpawnIfInfeasible()

```ts
refuseSpawnIfInfeasible(reserveUsd, accountScope?): void;
```

Defined in: [packages/core/src/engine/budget.ts:831](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L831)

The refusal arm of admitSpawn as a standalone check (RV904): throws
exactly the refusal admitSpawn would throw for this reserve (the
lifetime spawn cap, a full account, a ceiling overflow), marking
the run exhausted the same way, but commits NOTHING on success.
ctx.agent runs it against the smallest reserve any countTokens
outcome could produce, so a spawn the budget could never admit
refuses BEFORE the child prompt leaves the process; admitSpawn
still decides with the real reserve afterward, sharing this exact
arithmetic so the two can never disagree about a refusal.

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `reserveUsd` | `number` | `undefined` |
| `accountScope` | `string` | `ROOT_ACCOUNT` |

#### Returns

`void`

***

### releaseConvergenceReserve()

```ts
releaseConvergenceReserve(scope): void;
```

Defined in: [packages/core/src/engine/budget.ts:1061](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L1061)

The verdict pass dispatch consumes its reserve; see commitConvergenceReserve.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | `string` |

#### Returns

`void`

***

### releaseExposureHolder()

```ts
releaseExposureHolder(holderScope): number;
```

Defined in: [packages/core/src/engine/budget.ts:1306](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L1306)

The terminal backstop of the exposure surface (RV2001, the third
parity rerun's quiescence deadlock): EVERY terminal of an agent
invocation (ok, error, exhausted, cancelled) returns whatever live
dispatch estimates that holder still has to the exposure budget.
The attempt settle owns the per-hold closure in a finally, so this
usually finds nothing; the parity crash proved a dispatch path can
die without its closure (three killed children left 0.478 USD of
live estimates parked against the cap forever, and the root's
exposure wait starved on money no live dispatch was holding). A
real release wakes the parked waiters exactly like the closure
does; a holder with nothing held is a free no-op. Returns the USD
actually returned.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `holderScope` | `string` |

#### Returns

`number`

***

### releaseFinalizeReserve()

```ts
releaseFinalizeReserve(scope): void;
```

Defined in: [packages/core/src/engine/budget.ts:972](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L972)

The forced finish CONSUMES its reserve (DEF-7
reserve-survives-run-exhaustion): once the cap decision is durable
and the finalize dispatch begins, the reserve stops subtracting from
the admission remainder, or the finalize agent could never draw the
money reserved for it under a tight run ceiling. Admissions stay
frozen past the cap, so nothing else can take it.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | `string` |

#### Returns

`void`

***

### releaseRepairReserve()

```ts
releaseRepairReserve(scope): void;
```

Defined in: [packages/core/src/engine/budget.ts:1107](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L1107)

The round's finish loop consumes its leg; see commitRepairReserve.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | `string` |

#### Returns

`void`

***

### releaseReserve()

```ts
releaseReserve(reserveUsd, accountScope?): void;
```

Defined in: [packages/core/src/engine/budget.ts:1123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L1123)

The reserve is replaced by real spend when the spawn settles.

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `reserveUsd` | `number` | `undefined` |
| `accountScope` | `string` | `ROOT_ACCOUNT` |

#### Returns

`void`

***

### releaseSynthesisReserve()

```ts
releaseSynthesisReserve(scope): void;
```

Defined in: [packages/core/src/engine/budget.ts:1010](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L1010)

The synthesis dispatch consumes its reserve; see commitSynthesisReserve.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | `string` |

#### Returns

`void`

***

### remainderOf()

```ts
remainderOf(scope): number | undefined;
```

Defined in: [packages/core/src/engine/budget.ts:729](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L729)

The admission remainder of one account: ceiling minus spend minus
committed reserves minus the finalize reserve (DEF-7: childBudget
fractions never eat finalization money). Undefined when uncapped.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | `string` |

#### Returns

`number` \| `undefined`

***

### remaining()

```ts
remaining(): Spend | null;
```

Defined in: [packages/core/src/engine/budget.ts:1630](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L1630)

Null when the run has no USD ceiling.

#### Returns

[`Spend`](/api/@rulvar/core/type-aliases/Spend.md) \| `null`

***

### remainingUsd()

```ts
remainingUsd(accountScope?): number | undefined;
```

Defined in: [packages/core/src/engine/budget.ts:1409](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L1409)

The tightest chain headroom of `accountScope` in plain USD (RV301):
exactly the remaining money the output clamp below prices, before
any pricing. Undefined when every account on the chain is uncapped;
never negative. The tool budget extension admits a grant against
this number.

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `accountScope` | `string` | `ROOT_ACCOUNT` |

#### Returns

`number` \| `undefined`

***

### reserveTurnExposure()

```ts
reserveTurnExposure(
   servedBy, 
   estimatedInputTokens, 
   plannedOutputTokens, 
   holderScope?): (() => void) | undefined;
```

Defined in: [packages/core/src/engine/budget.ts:1162](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L1162)

The in-flight exposure reservation (RV711). The per-turn guard
below checks money already SPENT, so N concurrent turns each pass
it before any settles and together can cross the ceiling by up to
one whole turn each; this is the opt-in bound on that hole. The
caller reserves the attempt's own worst-case estimate (the prompt
estimate plus the planned output allowance, priced by the SAME
price rows as the layer-2b clamp) right before the wire call and
releases at the attempt's settle, so the reservation lives exactly
as long as the exposure it covers. The admission refuses, typed
and without waiting, when spent + live reservations + this
estimate does not fit the cap; an exact fill admits, mirroring
admitSpawn, and a full cap refuses even a zero estimate. The tail
reserves (finalize and synthesis) stay OUT of the sum (RV2101):
the budget chain already fences them (remainingUsd subtracts the
synthesis promise, and the finalize carve-out nets out of the
orchestrator's own cap), so counting them here too made the cap
bind at cap minus reserves while the actual wire risk was far
below it: the fourth parity run's root was refused at spent
4.71 + reserve 1.00 against 5.70 with zero live estimates, one
turn short of the synthesis the reserve existed to fund. A refusal
is TRANSIENT (in-flight money returns at settle), so it never
marks the run exhausted and never severs a stream. A model without
a price row reserves zero, exactly as it debits zero (the
once-per-model unpriced warning covers that hole). While an
attempt streams, its usage debits spentUsd with the reservation
still live, briefly counting the same money twice: conservative in
the safe direction, gone at release. Returns undefined (fully
inert) when the cap is not configured; layer-1 spawn reserves
(committedReserveUsd) stay out of the formula, because a child's
lifetime reserve and its own turn exposure would double-count.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `servedBy` | `` `${string}:${string}` `` |
| `estimatedInputTokens` | `number` |
| `plannedOutputTokens` | `number` |
| `holderScope?` | `string` |

#### Returns

(() => `void`) \| `undefined`

***

### signalOf()

```ts
signalOf(scope): AbortSignal | undefined;
```

Defined in: [packages/core/src/engine/budget.ts:781](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L781)

The layer-3 signal of one sub-account's subtree, when it exists.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | `string` |

#### Returns

`AbortSignal` \| `undefined`

***

### spent()

```ts
spent(): Spend;
```

Defined in: [packages/core/src/engine/budget.ts:1621](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L1621)

#### Returns

[`Spend`](/api/@rulvar/core/type-aliases/Spend.md)
