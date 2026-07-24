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
reconcile(reservationId, usage): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `reservationId` | `string` |
| `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`QuotaLimiter`](/api/@rulvar/rulvar/interfaces/QuotaLimiter.md).[`reconcile`](/api/@rulvar/rulvar/interfaces/QuotaLimiter.md#reconcile)

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
