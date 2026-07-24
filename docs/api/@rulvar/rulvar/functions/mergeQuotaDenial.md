[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / mergeQuotaDenial

# Function: mergeQuotaDenial()

```ts
function mergeQuotaDenial(current, next): {
  reason: string;
  retryAfterMs: number;
};
```

Defined in: `packages/core/dist/index.d.ts`

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
| `reason` | `string` | `packages/core/dist/index.d.ts` |
| `retryAfterMs` | `number` | `packages/core/dist/index.d.ts` |
