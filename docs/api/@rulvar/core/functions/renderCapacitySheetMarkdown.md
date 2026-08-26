[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / renderCapacitySheetMarkdown

# Function: renderCapacitySheetMarkdown()

```ts
function renderCapacitySheetMarkdown(sheet): string;
```

Defined in: [packages/core/src/orchestrator/capacity-sheet.ts:373](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L373)

Renders the sheet as Markdown: one heading per section, one line per
figure with its provenance label on the line, and the named
assumptions last. A reader who quotes any single line quotes its
provenance with it; that is the point.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `sheet` | [`CapacitySheet`](/api/@rulvar/core/interfaces/CapacitySheet.md) |

## Returns

`string`
