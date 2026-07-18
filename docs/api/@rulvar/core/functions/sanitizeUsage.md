[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / sanitizeUsage

# Function: sanitizeUsage()

```ts
function sanitizeUsage(usage): Usage;
```

Defined in: [packages/core/src/l0/usage.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/usage.ts#L135)

Conservative repair for accounting. Pairs with `usageViolations`: the
violation fails the call loud, and the sanitized numbers are the only
ones the journal, the cost report, and the budget may see. After the
per-field repair the cache subsets clamp into the input with reads
keeping priority, mirroring the adapter-level subset clamp. Valid
usage passes through structurally unchanged.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) |

## Returns

[`Usage`](/api/@rulvar/core/type-aliases/Usage.md)
