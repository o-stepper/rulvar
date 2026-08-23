[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / QuotaLimiter

# Interface: QuotaLimiter

Defined in: [packages/core/src/l0/spi/quota.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L103)

The shared rate/quota limiter seam; see the module contract above.

## Extended by

- [`MemoryQuotaLimiter`](/api/@rulvar/core/interfaces/MemoryQuotaLimiter.md)

## Methods

### reconcile()

```ts
reconcile(
   reservationId, 
   usage, 
actual?): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/quota.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L117)

Settles a reservation against the attempt's actual usage. The
optional `actual.requests` is the TRUE number of wire requests the
reservation ended up covering (RV905: an adapter absorbing
provider-side continuations makes several wire calls inside one
reserved dispatch); implementations add the difference over the
single request the reservation admitted into the same window, so
the request cap reflects what the provider actually metered. A
settlement never denies retroactively: the wire calls already
happened. Implementations written against the two-argument form
remain valid; they merely keep the historical undercount.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `reservationId` | `string` |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) |
| `actual?` | \{ `requests?`: `number`; \} |
| `actual.requests?` | `number` |

#### Returns

`Promise`\&lt;`void`\&gt;

***

### release()?

```ts
optional release(reservationId): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/quota.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L130)

Cancels an UNUSED admission (RV1013): the reserved wire never
left, so the admitted request and its token estimate return to
the window. This is NOT reconcile: a settlement only ever adds
(the calls already happened), while a release gives back exactly
what admission consumed for a wire that was never sent (the
engine calls it for pre-wire continuation reservations whose
segment never flew). MUST be idempotent and tolerate unknown or
expired ids as no-ops, like reconcile; a released id settles
nothing afterwards. Optional: implementations without it keep the
conservative window age-out for unused admissions.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `reservationId` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

***

### reserve()

```ts
reserve(request): Promise<QuotaDecision>;
```

Defined in: [packages/core/src/l0/spi/quota.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L104)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`QuotaReservationRequest`](/api/@rulvar/core/interfaces/QuotaReservationRequest.md) |

#### Returns

`Promise`\&lt;[`QuotaDecision`](/api/@rulvar/core/type-aliases/QuotaDecision.md)\&gt;
