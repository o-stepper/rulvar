[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / sanitizeUsage

# Function: sanitizeUsage()

```ts
function sanitizeUsage(usage): Usage;
```

Defined in: `packages/core/dist/index.d.ts`

Conservative repair for accounting. Pairs with `usageViolations`: the
violation fails the call loud, and the sanitized numbers are the only
ones the journal, the cost report, and the budget may see. After the
per-field repair the cache subsets clamp into the input with reads
keeping priority, mirroring the adapter-level subset clamp. Valid
usage passes through structurally unchanged.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) |

## Returns

[`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md)
