[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / capacitySheet

# Function: capacitySheet()

```ts
function capacitySheet(spec): CapacitySheet;
```

Defined in: `packages/core/dist/index.d.ts`

Builds the capacity sheet from the closed spec (RV4304). Pure and
deterministic; throws typed on junk. See the module doc for the
provenance rules it enforces.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`CapacitySheetSpec`](/api/@rulvar/rulvar/interfaces/CapacitySheetSpec.md) |

## Returns

[`CapacitySheet`](/api/@rulvar/rulvar/interfaces/CapacitySheet.md)
