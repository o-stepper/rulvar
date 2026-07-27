[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunBudget

# Class: RunBudget

Defined in: [packages/core/src/engine/budget.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L158)

The per-run budget account tree. All spend accounting is per instance;
the journal remains the durable source (the root is seeded by the
ledger fold on resume, M2; sub-account reserves are recovered from
spawn-admission decision entries, M6).

## Constructors

### Constructor

```ts
new RunBudget(options): RunBudget;
```

Defined in: [packages/core/src/engine/budget.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L174)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `ceilingUsd?`: `number`; `events?`: [`RuntimeEventSink`](/api/@rulvar/core/interfaces/RuntimeEventSink.md); `lifetimeSpawnCap?`: `number`; `priceUsd?`: (`servedBy`, `usage`) => `number` \| `undefined`; `pricingOf?`: (`servedBy`) => [`Pricing`](/api/@rulvar/core/interfaces/Pricing.md) \| `undefined`; `seed?`: \{ `agentsSpawned`: `number`; `usage`: [`Usage`](/api/@rulvar/core/type-aliases/Usage.md); `usd`: `number`; \}; \} | - |
| `options.ceilingUsd?` | `number` | - |
| `options.events?` | [`RuntimeEventSink`](/api/@rulvar/core/interfaces/RuntimeEventSink.md) | - |
| `options.lifetimeSpawnCap?` | `number` | - |
| `options.priceUsd?` | (`servedBy`, `usage`) => `number` \| `undefined` | - |
| `options.pricingOf?` | (`servedBy`) => [`Pricing`](/api/@rulvar/core/interfaces/Pricing.md) \| `undefined` | Raw price-row resolution for the layer-2b output bound. |
| `options.seed?` | \{ `agentsSpawned`: `number`; `usage`: [`Usage`](/api/@rulvar/core/type-aliases/Usage.md); `usd`: `number`; \} | The resume ledger fold: spend is never reset and never double-counted; replayed entries are already inside this seed and add no increments. |
| `options.seed.agentsSpawned` | `number` | - |
| `options.seed.usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - |
| `options.seed.usd` | `number` | - |

#### Returns

`RunBudget`

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-ceilingusd"></a> `ceilingUsd?` | `readonly` | `number` | B0; immutable after start. Undefined means no USD ceiling. | [packages/core/src/engine/budget.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L160) |

## Accessors

### committedReserveUsd

#### Get Signature

```ts
get committedReserveUsd(): number;
```

Defined in: [packages/core/src/engine/budget.ts:442](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L442)

##### Returns

`number`

***

### exhausted

#### Get Signature

```ts
get exhausted(): boolean;
```

Defined in: [packages/core/src/engine/budget.ts:428](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L428)

##### Returns

`boolean`

***

### signal

#### Get Signature

```ts
get signal(): AbortSignal;
```

Defined in: [packages/core/src/engine/budget.ts:419](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L419)

Layer 3 ceiling signal of the run root; live streams sever through it.

##### Returns

`AbortSignal`

***

### spawnHeadroom

#### Get Signature

```ts
get spawnHeadroom(): number;
```

Defined in: [packages/core/src/engine/budget.ts:447](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L447)

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

Defined in: [packages/core/src/engine/budget.ts:348](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L348)

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

Defined in: [packages/core/src/engine/budget.ts:525](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L525)

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

Defined in: [packages/core/src/engine/budget.ts:463](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L463)

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

Defined in: [packages/core/src/engine/budget.ts:400](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L400)

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

Defined in: [packages/core/src/engine/budget.ts:621](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L621)

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

Defined in: [packages/core/src/engine/budget.ts:541](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L541)

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

Defined in: [packages/core/src/engine/budget.ts:580](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L580)

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

Defined in: [packages/core/src/engine/budget.ts:310](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L310)

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

Defined in: [packages/core/src/engine/budget.ts:437](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L437)

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

Defined in: [packages/core/src/engine/budget.ts:671](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L671)

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

Defined in: [packages/core/src/engine/budget.ts:693](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L693)

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

Defined in: [packages/core/src/engine/budget.ts:261](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L261)

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

Defined in: [packages/core/src/engine/budget.ts:559](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L559)

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

Defined in: [packages/core/src/engine/budget.ts:613](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L613)

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

Defined in: [packages/core/src/engine/budget.ts:597](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L597)

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

Defined in: [packages/core/src/engine/budget.ts:374](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L374)

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

Defined in: [packages/core/src/engine/budget.ts:778](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L778)

Null when the run has no USD ceiling.

#### Returns

[`Spend`](/api/@rulvar/core/type-aliases/Spend.md) \| `null`

***

### remainingUsd()

```ts
remainingUsd(accountScope?): number | undefined;
```

Defined in: [packages/core/src/engine/budget.ts:659](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L659)

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

### signalOf()

```ts
signalOf(scope): AbortSignal | undefined;
```

Defined in: [packages/core/src/engine/budget.ts:424](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L424)

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

Defined in: [packages/core/src/engine/budget.ts:769](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L769)

#### Returns

[`Spend`](/api/@rulvar/core/type-aliases/Spend.md)
