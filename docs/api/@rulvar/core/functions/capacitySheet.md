[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / capacitySheet

# Function: capacitySheet()

```ts
function capacitySheet(spec): CapacitySheet;
```

Defined in: [packages/core/src/orchestrator/capacity-sheet.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L125)

Builds the capacity sheet from the closed spec (RV4304). Pure and
deterministic; throws typed on junk. See the module doc for the
provenance rules it enforces.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`CapacitySheetSpec`](/api/@rulvar/core/interfaces/CapacitySheetSpec.md) |

## Returns

[`CapacitySheet`](/api/@rulvar/core/interfaces/CapacitySheet.md)
