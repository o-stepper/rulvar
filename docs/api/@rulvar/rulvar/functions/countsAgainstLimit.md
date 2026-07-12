[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / countsAgainstLimit

# Function: countsAgainstLimit()

```ts
function countsAgainstLimit(kind): boolean;
```

Defined in: `packages/core/dist/index.d.ts`

countsAgainstLimit derivation (XF-06): true iff
scope_bigger; scope_different and blocked_with_evidence are exempt and
never debit the escalation counter.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `kind` | [`EscalationKind`](/api/@rulvar/rulvar/type-aliases/EscalationKind.md) |

## Returns

`boolean`
