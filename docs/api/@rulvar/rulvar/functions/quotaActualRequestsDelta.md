[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / quotaActualRequestsDelta

# Function: quotaActualRequestsDelta()

```ts
function quotaActualRequestsDelta(actual?): number;
```

Defined in: `packages/core/dist/index.d.ts`

The request-count settlement delta of one reservation (RV905): the
reservation admitted ONE wire request, and `actual.requests` names
how many the attempt actually made (an adapter absorbing
provider-side continuations dispatches several inside one reserved
call). Non-integer, non-positive, or absent actuals settle as the
single reserved request (delta 0); a settlement only ever ADDS, the
calls already happened. Shared by every reference limiter so the
three implementations cannot disagree about the arithmetic.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `actual?` | \{ `requests?`: `number`; \} |
| `actual.requests?` | `number` |

## Returns

`number`
