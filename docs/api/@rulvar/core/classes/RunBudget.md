[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunBudget

# Class: RunBudget

Defined in: [packages/core/src/engine/budget.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L169)

The per-run budget account tree. All spend accounting is per instance;
the journal remains the durable source (the root is seeded by the
ledger fold on resume, M2; sub-account reserves are recovered from
spawn-admission decision entries, M6).

## Constructors

### Constructor

```ts
new RunBudget(options): RunBudget;
```

Defined in: [packages/core/src/engine/budget.ts:192](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L192)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `ceilingUsd?`: `number`; `events?`: [`RuntimeEventSink`](/api/@rulvar/core/interfaces/RuntimeEventSink.md); `lifetimeSpawnCap?`: `number`; `maxInFlightExposureUsd?`: `number`; `priceUsd?`: (`servedBy`, `usage`) => `number` \| `undefined`; `pricingOf?`: (`servedBy`) => [`Pricing`](/api/@rulvar/core/interfaces/Pricing.md) \| `undefined`; `seed?`: \{ `agentsSpawned`: `number`; `usage`: [`Usage`](/api/@rulvar/core/type-aliases/Usage.md); `usd`: `number`; \}; \} | - |
| `options.ceilingUsd?` | `number` | - |
| `options.events?` | [`RuntimeEventSink`](/api/@rulvar/core/interfaces/RuntimeEventSink.md) | - |
| `options.lifetimeSpawnCap?` | `number` | - |
| `options.maxInFlightExposureUsd?` | `number` | The opt-in in-flight exposure cap (RV711); see reserveTurnExposure. |
| `options.priceUsd?` | (`servedBy`, `usage`) => `number` \| `undefined` | - |
| `options.pricingOf?` | (`servedBy`) => [`Pricing`](/api/@rulvar/core/interfaces/Pricing.md) \| `undefined` | Raw price-row resolution for the layer-2b output bound. |
| `options.seed?` | \{ `agentsSpawned`: `number`; `usage`: [`Usage`](/api/@rulvar/core/type-aliases/Usage.md); `usd`: `number`; \} | The resume seed, folded from the persisted journal (the settled per-call fold, RV801): spend is never reset and never double-counted; replayed entries are already inside this seed and add no increments. |
| `options.seed.agentsSpawned` | `number` | - |
| `options.seed.usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - |
| `options.seed.usd` | `number` | - |

#### Returns

`RunBudget`

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-ceilingusd"></a> `ceilingUsd?` | `readonly` | `number` | B0; immutable after start. Undefined means no USD ceiling. | [packages/core/src/engine/budget.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L171) |
| <a id="property-maxinflightexposureusd"></a> `maxInFlightExposureUsd?` | `readonly` | `number` | The opt-in in-flight exposure cap (RV711). Undefined means the reservation surface is inert and reserveTurnExposure never binds. | [packages/core/src/engine/budget.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L176) |

## Accessors

### committedReserveUsd

#### Get Signature

```ts
get committedReserveUsd(): number;
```

Defined in: [packages/core/src/engine/budget.ts:467](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L467)

##### Returns

`number`

***

### exhausted

#### Get Signature

```ts
get exhausted(): boolean;
```

Defined in: [packages/core/src/engine/budget.ts:453](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L453)

##### Returns

`boolean`

***

### signal

#### Get Signature

```ts
get signal(): AbortSignal;
```

Defined in: [packages/core/src/engine/budget.ts:444](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L444)

Layer 3 ceiling signal of the run root; live streams sever through it.

##### Returns

`AbortSignal`

***

### spawnHeadroom

#### Get Signature

```ts
get spawnHeadroom(): number;
```

Defined in: [packages/core/src/engine/budget.ts:472](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L472)

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

Defined in: [packages/core/src/engine/budget.ts:373](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L373)

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

Defined in: [packages/core/src/engine/budget.ts:550](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L550)

Resume roll-forward: commits a reserve recovered from a journaled
spawn-admission decision entry without re-evaluating admission
(reserves are recovered, never re-estimated).

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

Defined in: [packages/core/src/engine/budget.ts:488](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L488)

Layer 1: PROJECTED admission before spawn. A spawn is admitted only
when every account in the ancestor chain of `accountScope` still has
admission headroom AND fits the PROPOSED reserve on top of spent +
committedReserve + finalizeReserve (the finalize reserve is
untouchable by admission, DEF-7). An exact fill is allowed; one
dollar past the ceiling is not: a spawn is never admitted on the
argument that the money it needs is merely not committed yet. The
whole chain is checked before anything commits, so a rejection
mutates no account, increments no counter, and journals nothing.
Also enforces the engine lifetime spawn cap.

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

Defined in: [packages/core/src/engine/budget.ts:425](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L425)

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

### beforeTurn()

```ts
beforeTurn(accountScope?): void;
```

Defined in: [packages/core/src/engine/budget.ts:725](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L725)

Layer 2: the per-turn guard. A turn that would cross any ceiling in the chain is not dispatched.

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `accountScope` | `string` | `ROOT_ACCOUNT` |

#### Returns

`void`

***

### commitFinalizeReserve()

```ts
commitFinalizeReserve(scope, reserveUsd): void;
```

Defined in: [packages/core/src/engine/budget.ts:566](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L566)

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

### commitSynthesisReserve()

```ts
commitSynthesisReserve(scope, reserveUsd): void;
```

Defined in: [packages/core/src/engine/budget.ts:605](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L605)

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

Defined in: [packages/core/src/engine/budget.ts:335](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L335)

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

Defined in: [packages/core/src/engine/budget.ts:462](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L462)

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

Defined in: [packages/core/src/engine/budget.ts:775](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L775)

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `servedBy` | `` `${string}:${string}` `` | `undefined` |
| `estimatedInputTokens` | `number` | `undefined` |
| `accountScope` | `string` | `ROOT_ACCOUNT` |

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

Defined in: [packages/core/src/engine/budget.ts:797](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L797)

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

Defined in: [packages/core/src/engine/budget.ts:286](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L286)

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

### releaseFinalizeReserve()

```ts
releaseFinalizeReserve(scope): void;
```

Defined in: [packages/core/src/engine/budget.ts:584](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L584)

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

### releaseReserve()

```ts
releaseReserve(reserveUsd, accountScope?): void;
```

Defined in: [packages/core/src/engine/budget.ts:638](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L638)

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

Defined in: [packages/core/src/engine/budget.ts:622](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L622)

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

Defined in: [packages/core/src/engine/budget.ts:399](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L399)

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

Defined in: [packages/core/src/engine/budget.ts:882](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L882)

Null when the run has no USD ceiling.

#### Returns

[`Spend`](/api/@rulvar/core/type-aliases/Spend.md) \| `null`

***

### remainingUsd()

```ts
remainingUsd(accountScope?): number | undefined;
```

Defined in: [packages/core/src/engine/budget.ts:763](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L763)

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
   plannedOutputTokens): (() => void) | undefined;
```

Defined in: [packages/core/src/engine/budget.ts:670](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L670)

The in-flight exposure reservation (RV711). The per-turn guard
below checks money already SPENT, so N concurrent turns each pass
it before any settles and together can cross the ceiling by up to
one whole turn each; this is the opt-in bound on that hole. The
caller reserves the attempt's own worst-case estimate (the prompt
estimate plus the planned output allowance, priced by the SAME
price rows as the layer-2b clamp) right before the wire call and
releases at the attempt's settle, so the reservation lives exactly
as long as the exposure it covers. The admission refuses, typed
and without waiting, when spent + the named reserves (finalize and
synthesis money is promised elsewhere) + live reservations + this
estimate does not fit the cap; an exact fill admits, mirroring
admitSpawn, and a full cap refuses even a zero estimate. A refusal
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

#### Returns

(() => `void`) \| `undefined`

***

### signalOf()

```ts
signalOf(scope): AbortSignal | undefined;
```

Defined in: [packages/core/src/engine/budget.ts:449](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L449)

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

Defined in: [packages/core/src/engine/budget.ts:873](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L873)

#### Returns

[`Spend`](/api/@rulvar/core/type-aliases/Spend.md)
