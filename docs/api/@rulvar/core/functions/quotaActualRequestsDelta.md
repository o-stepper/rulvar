[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / quotaActualRequestsDelta

# Function: quotaActualRequestsDelta()

```ts
function quotaActualRequestsDelta(actual?): number;
```

Defined in: [packages/core/src/model/quota.ts:254](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L254)

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
