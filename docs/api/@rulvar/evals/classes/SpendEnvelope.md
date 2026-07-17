[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / SpendEnvelope

# Class: SpendEnvelope

Defined in: [packages/evals/src/envelope.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/envelope.ts#L54)

One envelope bounds one whole sweep invocation: share the instance
across the canary loop and runSweepMatrix so canary, target, and
judge runs all draw from the same remainder.

## Constructors

### Constructor

```ts
new SpendEnvelope(maxTotalUsd): SpendEnvelope;
```

Defined in: [packages/evals/src/envelope.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/envelope.ts#L59)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `maxTotalUsd` | `number` |

#### Returns

`SpendEnvelope`

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-maxtotalusd"></a> `maxTotalUsd` | `readonly` | `number` | [packages/evals/src/envelope.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/envelope.ts#L55) |

## Accessors

### authorizedUsd

#### Get Signature

```ts
get authorizedUsd(): number;
```

Defined in: [packages/evals/src/envelope.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/envelope.ts#L70)

Total authorized so far (debit-only; never decreases).

##### Returns

`number`

***

### remainingUsd

#### Get Signature

```ts
get remainingUsd(): number;
```

Defined in: [packages/evals/src/envelope.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/envelope.ts#L74)

##### Returns

`number`

## Methods

### authorize()

```ts
authorize(ceilingUsd, runLabel): void;
```

Defined in: [packages/evals/src/envelope.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/envelope.ts#L84)

Authorizes one run's immutable ceiling or throws SweepBudgetError.
An unbounded run cannot be authorized: under an envelope every run
MUST carry an explicit positive ceiling, otherwise the aggregate
bound would be unaccountable.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `ceilingUsd` | `number` \| `undefined` |
| `runLabel` | `string` |

#### Returns

`void`
