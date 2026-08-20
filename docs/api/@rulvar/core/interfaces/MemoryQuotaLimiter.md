[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / MemoryQuotaLimiter

# Interface: MemoryQuotaLimiter

Defined in: [packages/core/src/model/quota.ts:345](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L345)

The in-process reference QuotaLimiter returned by memoryQuotaLimiter.

## Extends

- [`QuotaLimiter`](/api/@rulvar/core/interfaces/QuotaLimiter.md)

## Methods

### reconcile()

```ts
reconcile(
   reservationId, 
   usage, 
actual?): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/quota.ts:116](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L116)

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

#### Inherited from

[`QuotaLimiter`](/api/@rulvar/core/interfaces/QuotaLimiter.md).[`reconcile`](/api/@rulvar/core/interfaces/QuotaLimiter.md#reconcile)

***

### release()

```ts
release(reservationId): Promise<void>;
```

Defined in: [packages/core/src/model/quota.ts:349](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L349)

The reference limiter always implements release (RV1013).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `reservationId` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Overrides

[`QuotaLimiter`](/api/@rulvar/core/interfaces/QuotaLimiter.md).[`release`](/api/@rulvar/core/interfaces/QuotaLimiter.md#release)

***

### reserve()

```ts
reserve(request): Promise<QuotaDecision>;
```

Defined in: [packages/core/src/l0/spi/quota.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L103)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`QuotaReservationRequest`](/api/@rulvar/core/interfaces/QuotaReservationRequest.md) |

#### Returns

`Promise`\&lt;[`QuotaDecision`](/api/@rulvar/core/type-aliases/QuotaDecision.md)\&gt;

#### Inherited from

[`QuotaLimiter`](/api/@rulvar/core/interfaces/QuotaLimiter.md).[`reserve`](/api/@rulvar/core/interfaces/QuotaLimiter.md#reserve)

***

### snapshot()

```ts
snapshot(): QuotaWindowSnapshot[];
```

Defined in: [packages/core/src/model/quota.ts:347](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L347)

Current-window counters per rule; rolled-over windows read as zero.

#### Returns

[`QuotaWindowSnapshot`](/api/@rulvar/core/interfaces/QuotaWindowSnapshot.md)[]
