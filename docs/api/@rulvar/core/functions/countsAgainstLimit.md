[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / countsAgainstLimit

# Function: countsAgainstLimit()

```ts
function countsAgainstLimit(kind): boolean;
```

Defined in: [packages/core/src/runtime/escalation.ts:180](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L180)

countsAgainstLimit derivation (XF-06): true iff
scope_bigger; scope_different and blocked_with_evidence are exempt and
never debit the escalation counter.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `kind` | [`EscalationKind`](/api/@rulvar/core/type-aliases/EscalationKind.md) |

## Returns

`boolean`
