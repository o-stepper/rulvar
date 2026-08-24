[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / coverMerge

# Function: coverMerge()

```ts
function coverMerge(current, next): AdmissionReservation;
```

Defined in: [packages/core/src/admission/algorithms.ts:226](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/algorithms.ts#L226)

Monotone high-water merge of covers (checkpoint THEN consume).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `current` | \| [`AdmissionReservation`](/api/@rulvar/core/interfaces/AdmissionReservation.md) \| `undefined` |
| `next` | [`AdmissionReservation`](/api/@rulvar/core/interfaces/AdmissionReservation.md) |

## Returns

[`AdmissionReservation`](/api/@rulvar/core/interfaces/AdmissionReservation.md)
