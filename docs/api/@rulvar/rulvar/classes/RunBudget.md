[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RunBudget

# Class: RunBudget

Defined in: `packages/core/dist/index.d.ts`

The per-run budget account tree. All spend accounting is per instance;
the journal remains the durable source (the root is seeded by the
ledger fold on resume, M2; sub-account reserves are recovered from
spawn-admission decision entries, M6).

## Constructors

### Constructor

```ts
new RunBudget(options): RunBudget;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `ceilingUsd?`: `number`; `events?`: [`RuntimeEventSink`](/api/@rulvar/rulvar/interfaces/RuntimeEventSink.md); `lifetimeSpawnCap?`: `number`; `priceUsd?`: (`servedBy`, `usage`) => `number` \| `undefined`; `pricingOf?`: (`servedBy`) => [`Pricing`](/api/@rulvar/rulvar/interfaces/Pricing.md) \| `undefined`; `seed?`: \{ `agentsSpawned`: `number`; `usage`: [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md); `usd`: `number`; \}; \} | - |
| `options.ceilingUsd?` | `number` | - |
| `options.events?` | [`RuntimeEventSink`](/api/@rulvar/rulvar/interfaces/RuntimeEventSink.md) | - |
| `options.lifetimeSpawnCap?` | `number` | - |
| `options.priceUsd?` | (`servedBy`, `usage`) => `number` \| `undefined` | - |
| `options.pricingOf?` | (`servedBy`) => [`Pricing`](/api/@rulvar/rulvar/interfaces/Pricing.md) \| `undefined` | - |
| `options.seed?` | \{ `agentsSpawned`: `number`; `usage`: [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md); `usd`: `number`; \} | The resume ledger fold: spend is never reset and never double-counted; replayed entries are already inside this seed and add no increments. |
| `options.seed.agentsSpawned` | `number` | - |
| `options.seed.usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) | - |
| `options.seed.usd` | `number` | - |

#### Returns

`RunBudget`

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-ceilingusd"></a> `ceilingUsd?` | `readonly` | `number` | B0; immutable after start. Undefined means no USD ceiling. | `packages/core/dist/index.d.ts` |

## Accessors

### committedReserveUsd

#### Get Signature

```ts
get committedReserveUsd(): number;
```

Defined in: `packages/core/dist/index.d.ts`

##### Returns

`number`

***

### exhausted

#### Get Signature

```ts
get exhausted(): boolean;
```

Defined in: `packages/core/dist/index.d.ts`

##### Returns

`boolean`

***

### signal

#### Get Signature

```ts
get signal(): AbortSignal;
```

Defined in: `packages/core/dist/index.d.ts`

Layer 3 ceiling signal of the run root; live streams sever through it.

##### Returns

`AbortSignal`

***

### spawnHeadroom

#### Get Signature

```ts
get spawnHeadroom(): number;
```

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | `string` |

#### Returns

  \| [`BudgetAccountView`](/api/@rulvar/rulvar/interfaces/BudgetAccountView.md)
  \| `undefined`

***

### admitRecovered()

```ts
admitRecovered(reserveUsd, accountScope?): void;
```

Defined in: `packages/core/dist/index.d.ts`

Resume roll-forward: commits a reserve recovered from a journaled
spawn-admission decision entry without re-evaluating admission
(reserves are recovered, never re-estimated).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `reserveUsd` | `number` |
| `accountScope?` | `string` |

#### Returns

`void`

***

### admitSpawn()

```ts
admitSpawn(reserveUsd, accountScope?): void;
```

Defined in: `packages/core/dist/index.d.ts`

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

| Parameter | Type |
| ------ | ------ |
| `reserveUsd` | `number` |
| `accountScope?` | `string` |

#### Returns

`void`

***

### beforeTurn()

```ts
beforeTurn(accountScope?): void;
```

Defined in: `packages/core/dist/index.d.ts`

Layer 2: the per-turn guard. A turn that would cross any ceiling in the chain is not dispatched.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `accountScope?` | `string` |

#### Returns

`void`

***

### commitFinalizeReserve()

```ts
commitFinalizeReserve(scope, reserveUsd): void;
```

Defined in: `packages/core/dist/index.d.ts`

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

### exhaustionDiagnostics()

```ts
exhaustionDiagnostics(scope): BudgetExhaustionDiagnostics;
```

Defined in: `packages/core/dist/index.d.ts`

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

[`BudgetExhaustionDiagnostics`](/api/@rulvar/rulvar/interfaces/BudgetExhaustionDiagnostics.md)

***

### markExhausted()

```ts
markExhausted(): void;
```

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

Layer 2b, the pre-dispatch output bound: the output tokens the
remaining chain budget (min over capped ancestors of ceiling minus
spend) still affords from `servedBy` for an estimated prompt, priced
by the same function as settlement, long-context tiers included.
Undefined when no account in the chain carries a USD ceiling, when
the model has no price row (the once-per-model unpriced warning in
onUsage covers that hole), or when output is free. Zero or negative
means the turn cannot be dispatched within the budget.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `servedBy` | `` `${string}:${string}` `` |
| `estimatedInputTokens` | `number` |
| `accountScope?` | `string` |

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

Defined in: `packages/core/dist/index.d.ts`

Live accounting; spend propagates from `accountScope` to every
ancestor. Crossing a ceiling severs the crossing account's subtree
via its layer-3 AbortSignal (overshoot bounded by one turn per
in-flight agent; providers bill severed streams).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) |
| `servedBy` | `` `${string}:${string}` `` |
| `accountScope?` | `string` |

#### Returns

`void`

***

### openAccount()

```ts
openAccount(scope, options): void;
```

Defined in: `packages/core/dist/index.d.ts`

Opens a child sub-account under `parentScope`.
Re-opening an existing scope is the resume roll-forward path: the
recorded ceiling wins once and the accumulated state is kept.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | `string` |
| `options` | \{ `ceilingUsd?`: `number`; `finalizeReserveUsd?`: `number`; `kind?`: `"orchestrator-cap"`; `parentScope?`: `string`; \} |
| `options.ceilingUsd?` | `number` |
| `options.finalizeReserveUsd?` | `number` |
| `options.kind?` | `"orchestrator-cap"` |
| `options.parentScope?` | `string` |

#### Returns

`void`

***

### releaseFinalizeReserve()

```ts
releaseFinalizeReserve(scope): void;
```

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

The reserve is replaced by real spend when the spawn settles.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `reserveUsd` | `number` |
| `accountScope?` | `string` |

#### Returns

`void`

***

### remainderOf()

```ts
remainderOf(scope): number | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

Null when the run has no USD ceiling.

#### Returns

[`Spend`](/api/@rulvar/rulvar/type-aliases/Spend.md) \| `null`

***

### signalOf()

```ts
signalOf(scope): AbortSignal | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

#### Returns

[`Spend`](/api/@rulvar/rulvar/type-aliases/Spend.md)
