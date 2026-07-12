[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunBudget

# Class: RunBudget

Defined in: [packages/core/src/engine/budget.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L96)

The per-run budget account tree. All spend accounting is per instance;
the journal remains the durable source (the root is seeded by the
ledger fold on resume, M2; sub-account reserves are recovered from
spawn-admission decision entries, M6).

## Constructors

### Constructor

```ts
new RunBudget(options): RunBudget;
```

Defined in: [packages/core/src/engine/budget.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L107)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `ceilingUsd?`: `number`; `events?`: [`RuntimeEventSink`](/api/@rulvar/core/interfaces/RuntimeEventSink.md); `lifetimeSpawnCap?`: `number`; `priceUsd?`: (`servedBy`, `usage`) => `number` \| `undefined`; `seed?`: \{ `agentsSpawned`: `number`; `usage`: [`Usage`](/api/@rulvar/core/type-aliases/Usage.md); `usd`: `number`; \}; \} | - |
| `options.ceilingUsd?` | `number` | - |
| `options.events?` | [`RuntimeEventSink`](/api/@rulvar/core/interfaces/RuntimeEventSink.md) | - |
| `options.lifetimeSpawnCap?` | `number` | - |
| `options.priceUsd?` | (`servedBy`, `usage`) => `number` \| `undefined` | - |
| `options.seed?` | \{ `agentsSpawned`: `number`; `usage`: [`Usage`](/api/@rulvar/core/type-aliases/Usage.md); `usd`: `number`; \} | The resume ledger fold (docs/03, section 13.3): spend is never reset and never double-counted; replayed entries are already inside this seed and add no increments. |
| `options.seed.agentsSpawned` | `number` | - |
| `options.seed.usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - |
| `options.seed.usd` | `number` | - |

#### Returns

`RunBudget`

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-ceilingusd"></a> `ceilingUsd?` | `readonly` | `number` | B0; immutable after start. Undefined means no USD ceiling. | [packages/core/src/engine/budget.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L98) |

## Accessors

### committedReserveUsd

#### Get Signature

```ts
get committedReserveUsd(): number;
```

Defined in: [packages/core/src/engine/budget.ts:269](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L269)

##### Returns

`number`

***

### exhausted

#### Get Signature

```ts
get exhausted(): boolean;
```

Defined in: [packages/core/src/engine/budget.ts:255](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L255)

##### Returns

`boolean`

***

### signal

#### Get Signature

```ts
get signal(): AbortSignal;
```

Defined in: [packages/core/src/engine/budget.ts:246](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L246)

Layer 3 ceiling signal of the run root; live streams sever through it.

##### Returns

`AbortSignal`

***

### spawnHeadroom

#### Get Signature

```ts
get spawnHeadroom(): number;
```

Defined in: [packages/core/src/engine/budget.ts:274](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L274)

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

Defined in: [packages/core/src/engine/budget.ts:206](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L206)

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

Defined in: [packages/core/src/engine/budget.ts:332](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L332)

Resume roll-forward: commits a reserve recovered from a journaled
spawn-admission decision entry without re-evaluating admission
(docs/06, 5.1: reserves are recovered, never re-estimated).

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

Defined in: [packages/core/src/engine/budget.ts:284](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L284)

Layer 1: admission before spawn. Blocks when spent + committedReserve
has reached the ceiling on ANY account in the ancestor chain of
`accountScope`, otherwise commits the reserve along the whole chain.
Also enforces the engine lifetime spawn cap (docs/06, "Scheduler").

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `reserveUsd` | `number` | `undefined` |
| `accountScope` | `string` | `ROOT_ACCOUNT` |

#### Returns

`void`

***

### beforeTurn()

```ts
beforeTurn(accountScope?): void;
```

Defined in: [packages/core/src/engine/budget.ts:384](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L384)

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

Defined in: [packages/core/src/engine/budget.ts:348](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L348)

Registers the orchestrator finalize reserve (DEF-7, docs/07 12.2):
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

### markExhausted()

```ts
markExhausted(): void;
```

Defined in: [packages/core/src/engine/budget.ts:264](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L264)

Marks the run exhausted without a ceiling event: the orchestrator
finalize fallback maps to outcome 'exhausted' with the synthesized
partial value (DEF-7, docs/07 12.4; exhaustion is never null).

#### Returns

`void`

***

### onUsage()

```ts
onUsage(
   usage, 
   servedBy, 
   accountScope?): void;
```

Defined in: [packages/core/src/engine/budget.ts:411](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L411)

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

Defined in: [packages/core/src/engine/budget.ts:178](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L178)

Opens a child sub-account under `parentScope` (docs/06, section 5.4).
Re-opening an existing scope is the resume roll-forward path: the
recorded ceiling wins once and the accumulated state is kept.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | `string` |
| `options` | \{ `ceilingUsd?`: `number`; `finalizeReserveUsd?`: `number`; `parentScope?`: `string`; \} |
| `options.ceilingUsd?` | `number` |
| `options.finalizeReserveUsd?` | `number` |
| `options.parentScope?` | `string` |

#### Returns

`void`

***

### releaseFinalizeReserve()

```ts
releaseFinalizeReserve(scope): void;
```

Defined in: [packages/core/src/engine/budget.ts:366](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L366)

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

Defined in: [packages/core/src/engine/budget.ts:376](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L376)

The reserve is replaced by real spend when the spawn settles.

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `reserveUsd` | `number` | `undefined` |
| `accountScope` | `string` | `ROOT_ACCOUNT` |

#### Returns

`void`

***

### remainderOf()

```ts
remainderOf(scope): number | undefined;
```

Defined in: [packages/core/src/engine/budget.ts:231](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L231)

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

Defined in: [packages/core/src/engine/budget.ts:448](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L448)

Null when the run has no USD ceiling (docs/06, section "Canonical Ctx interface").

#### Returns

[`Spend`](/api/@rulvar/core/type-aliases/Spend.md) \| `null`

***

### signalOf()

```ts
signalOf(scope): AbortSignal | undefined;
```

Defined in: [packages/core/src/engine/budget.ts:251](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L251)

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

Defined in: [packages/core/src/engine/budget.ts:439](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L439)

#### Returns

[`Spend`](/api/@rulvar/core/type-aliases/Spend.md)
