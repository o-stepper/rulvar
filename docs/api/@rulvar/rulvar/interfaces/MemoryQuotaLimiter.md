[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / MemoryQuotaLimiter

# Interface: MemoryQuotaLimiter

Defined in: `packages/core/dist/index.d.ts`

The in-process reference QuotaLimiter returned by memoryQuotaLimiter.

## Extends

- [`QuotaLimiter`](/api/@rulvar/rulvar/interfaces/QuotaLimiter.md)

## Methods

### reconcile()

```ts
reconcile(
   reservationId, 
   usage, 
actual?): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

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
| `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) |
| `actual?` | \{ `requests?`: `number`; \} |
| `actual.requests?` | `number` |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`QuotaLimiter`](/api/@rulvar/rulvar/interfaces/QuotaLimiter.md).[`reconcile`](/api/@rulvar/rulvar/interfaces/QuotaLimiter.md#reconcile)

***

### release()

```ts
release(reservationId): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

The reference limiter always implements release (RV1013).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `reservationId` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Overrides

[`QuotaLimiter`](/api/@rulvar/rulvar/interfaces/QuotaLimiter.md).[`release`](/api/@rulvar/rulvar/interfaces/QuotaLimiter.md#release)

***

### reserve()

```ts
reserve(request): Promise<QuotaDecision>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`QuotaReservationRequest`](/api/@rulvar/rulvar/interfaces/QuotaReservationRequest.md) |

#### Returns

`Promise`\&lt;[`QuotaDecision`](/api/@rulvar/rulvar/type-aliases/QuotaDecision.md)\&gt;

#### Inherited from

[`QuotaLimiter`](/api/@rulvar/rulvar/interfaces/QuotaLimiter.md).[`reserve`](/api/@rulvar/rulvar/interfaces/QuotaLimiter.md#reserve)

***

### snapshot()

```ts
snapshot(): QuotaWindowSnapshot[];
```

Defined in: `packages/core/dist/index.d.ts`

Current-window counters per rule; rolled-over windows read as zero.

#### Returns

[`QuotaWindowSnapshot`](/api/@rulvar/rulvar/interfaces/QuotaWindowSnapshot.md)[]
