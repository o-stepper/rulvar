[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / countsAgainstLimit

# Function: countsAgainstLimit()

```ts
function countsAgainstLimit(kind): boolean;
```

Defined in: [packages/core/src/runtime/escalation.ts:182](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L182)

countsAgainstLimit derivation (docs/07, section 6.3, XF-06): true iff
scope_bigger; scope_different and blocked_with_evidence are exempt and
never debit the escalation counter.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `kind` | [`EscalationKind`](/api/@rulvar/core/type-aliases/EscalationKind.md) |

## Returns

`boolean`
