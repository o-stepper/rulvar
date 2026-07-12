[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / buildTerminationInitValue

# Function: buildTerminationInitValue()

```ts
function buildTerminationInitValue(limits, registrySnapshotHash): TerminationInitValue;
```

Defined in: [packages/core/src/journal/termination.ts:193](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L193)

Builds the termination.init value payload.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `limits` | [`TerminationLimits`](/api/@rulvar/core/interfaces/TerminationLimits.md) |
| `registrySnapshotHash` | `string` |

## Returns

[`TerminationInitValue`](/api/@rulvar/core/interfaces/TerminationInitValue.md)
