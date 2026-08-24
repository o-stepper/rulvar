[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / reservationMinus

# Function: reservationMinus()

```ts
function reservationMinus(a, b): AdmissionReservation;
```

Defined in: [packages/core/src/admission/algorithms.ts:209](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/admission/algorithms.ts#L209)

Reservation arithmetic helpers (component-wise, absent = 0).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `a` | [`AdmissionReservation`](/api/@rulvar/core/interfaces/AdmissionReservation.md) |
| `b` | \| [`AdmissionReservation`](/api/@rulvar/core/interfaces/AdmissionReservation.md) \| `undefined` |

## Returns

[`AdmissionReservation`](/api/@rulvar/core/interfaces/AdmissionReservation.md)
