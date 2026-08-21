[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / renderCapacitySheetMarkdown

# Function: renderCapacitySheetMarkdown()

```ts
function renderCapacitySheetMarkdown(sheet): string;
```

Defined in: `packages/core/dist/index.d.ts`

Renders the sheet as Markdown: one heading per section, one line per
figure with its provenance label on the line, and the named
assumptions last. A reader who quotes any single line quotes its
provenance with it; that is the point.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `sheet` | [`CapacitySheet`](/api/@rulvar/rulvar/interfaces/CapacitySheet.md) |

## Returns

`string`
