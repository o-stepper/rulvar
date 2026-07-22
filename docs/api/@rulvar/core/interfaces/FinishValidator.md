[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FinishValidator

# Interface: FinishValidator

Defined in: [packages/core/src/orchestrator/finish-validators.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L65)

A deterministic host validator of the orchestrator finish result.
`validate` must be pure, synchronous host code: no model calls, no
clock, no filesystem, because a verdict must reproduce on replay and a
throwing validator is a host defect that fails the run as ConfigError
(never journaled, never granted a repair turn).

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-name"></a> `name` | `readonly` | `string` | Unique within one orchestrate call; appears in the journaled verdicts, the repair feedback, and the orchestrator prompt. | [packages/core/src/orchestrator/finish-validators.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L70) |

## Methods

### validate()

```ts
validate(input): FinishValidationVerdict;
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L71)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`FinishValidationInput`](/api/@rulvar/core/interfaces/FinishValidationInput.md) |

#### Returns

[`FinishValidationVerdict`](/api/@rulvar/core/type-aliases/FinishValidationVerdict.md)
