[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / sfqGrantOrder

# Function: sfqGrantOrder()

```ts
function sfqGrantOrder<T>(queued): T[];
```

Defined in: `packages/core/dist/index.d.ts`

The deterministic grant order over queued rows: smallest start tag,
ties by arrival seq. Two replicas over the same rows sort identically.

## Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* \{ `arrivalSeq`: `number`; `startTag`: `number`; \} |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `queued` | readonly `T`[] |

## Returns

`T`[]
