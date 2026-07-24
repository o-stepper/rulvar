[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / mergeQuotaDenial

# Function: mergeQuotaDenial()

```ts
function mergeQuotaDenial(current, next): {
  reason: string;
  retryAfterMs: number;
};
```

Defined in: [packages/core/src/model/quota.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L165)

Folds one more failing rule into the decision the caller returns:
the wait is the LONGEST failing horizon (every matching rule must
admit), and the FIRST failing rule names the denial.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `current` | \| \{ `reason`: `string`; `retryAfterMs`: `number`; \} \| `undefined` |
| `next` | \{ `reason`: `string`; `retryAfterMs`: `number`; \} |
| `next.reason` | `string` |
| `next.retryAfterMs` | `number` |

## Returns

```ts
{
  reason: string;
  retryAfterMs: number;
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `reason` | `string` | [packages/core/src/model/quota.ts:168](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L168) |
| `retryAfterMs` | `number` | [packages/core/src/model/quota.ts:168](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L168) |
