[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / coverMerge

# Function: coverMerge()

```ts
function coverMerge(current, next): AdmissionReservation;
```

Defined in: `packages/core/dist/index.d.ts`

Monotone high-water merge of covers (checkpoint THEN consume).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `current` | \| [`AdmissionReservation`](/api/@rulvar/rulvar/interfaces/AdmissionReservation.md) \| `undefined` |
| `next` | [`AdmissionReservation`](/api/@rulvar/rulvar/interfaces/AdmissionReservation.md) |

## Returns

[`AdmissionReservation`](/api/@rulvar/rulvar/interfaces/AdmissionReservation.md)
