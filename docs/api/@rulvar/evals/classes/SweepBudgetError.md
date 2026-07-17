[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / SweepBudgetError

# Class: SweepBudgetError

Defined in: [packages/evals/src/envelope.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/envelope.ts#L27)

Thrown when authorizing a run's ceiling would exceed the envelope.

## Extends

- `Error`

## Constructors

### Constructor

```ts
new SweepBudgetError(
   runLabel, 
   ceilingUsd, 
   authorizedUsd, 
   maxTotalUsd): SweepBudgetError;
```

Defined in: [packages/evals/src/envelope.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/envelope.ts#L35)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runLabel` | `string` |
| `ceilingUsd` | `number` |
| `authorizedUsd` | `number` |
| `maxTotalUsd` | `number` |

#### Returns

`SweepBudgetError`

#### Overrides

```ts
Error.constructor
```

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-authorizedusd"></a> `authorizedUsd` | `readonly` | `number` | Total already authorized before this refusal. | [packages/evals/src/envelope.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/envelope.ts#L33) |
| <a id="property-ceilingusd"></a> `ceilingUsd` | `readonly` | `number` | The per-run ceiling that did not fit. | [packages/evals/src/envelope.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/envelope.ts#L31) |
| <a id="property-maxtotalusd"></a> `maxTotalUsd` | `readonly` | `number` | - | [packages/evals/src/envelope.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/envelope.ts#L34) |
| <a id="property-runlabel"></a> `runLabel` | `readonly` | `string` | What was about to start, e.g. `eval target 'sweep-math'`. | [packages/evals/src/envelope.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/envelope.ts#L29) |
