[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / FinishValidator

# Interface: FinishValidator

Defined in: `packages/core/dist/index.d.ts`

A deterministic host validator of the orchestrator finish result.
`validate` must be pure, synchronous host code: no model calls, no
clock, no filesystem, because a verdict must reproduce on replay and a
throwing validator is a host defect that fails the run as ConfigError
(never journaled, never granted a repair turn).

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-name"></a> `name` | `readonly` | `string` | Unique within one orchestrate call; appears in the journaled verdicts, the repair feedback, and the orchestrator prompt. | `packages/core/dist/index.d.ts` |

## Methods

### validate()

```ts
validate(input): FinishValidationVerdict;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`FinishValidationInput`](/api/@rulvar/rulvar/interfaces/FinishValidationInput.md) |

#### Returns

[`FinishValidationVerdict`](/api/@rulvar/rulvar/type-aliases/FinishValidationVerdict.md)
