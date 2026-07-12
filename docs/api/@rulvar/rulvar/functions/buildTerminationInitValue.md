[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / buildTerminationInitValue

# Function: buildTerminationInitValue()

```ts
function buildTerminationInitValue(limits, registrySnapshotHash): TerminationInitValue;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Builds the termination.init value payload (docs/07, 11.6).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `limits` | [`TerminationLimits`](/api/@rulvar/rulvar/interfaces/TerminationLimits.md) |
| `registrySnapshotHash` | `string` |

## Returns

[`TerminationInitValue`](/api/@rulvar/rulvar/interfaces/TerminationInitValue.md)
