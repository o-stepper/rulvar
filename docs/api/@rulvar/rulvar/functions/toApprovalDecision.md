[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / toApprovalDecision

# Function: toApprovalDecision()

```ts
function toApprovalDecision(value): ApprovalDecision;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Normalizes a resolution value into an ApprovalDecision. Anything that
is not an explicit allow is a deny: an approval never fails open.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) |

## Returns

[`ApprovalDecision`](/api/@rulvar/rulvar/interfaces/ApprovalDecision.md)
