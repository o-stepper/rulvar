[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / toApprovalDecision

# Function: toApprovalDecision()

```ts
function toApprovalDecision(value): ApprovalDecision;
```

Defined in: [packages/core/src/engine/external.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/external.ts#L46)

Normalizes a resolution value into an ApprovalDecision. Anything that
is not an explicit allow is a deny: an approval never fails open.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) |

## Returns

[`ApprovalDecision`](/api/@rulvar/core/interfaces/ApprovalDecision.md)
