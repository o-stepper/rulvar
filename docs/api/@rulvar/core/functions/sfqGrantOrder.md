[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / sfqGrantOrder

# Function: sfqGrantOrder()

```ts
function sfqGrantOrder<T>(queued): T[];
```

Defined in: [packages/core/src/admission/algorithms.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/algorithms.ts#L72)

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
