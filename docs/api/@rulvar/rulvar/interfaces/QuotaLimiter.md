[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / QuotaLimiter

# Interface: QuotaLimiter

Defined in: `packages/core/dist/index.d.ts`

The shared rate/quota limiter seam; see the module contract above.

## Extended by

- [`MemoryQuotaLimiter`](/api/@rulvar/rulvar/interfaces/MemoryQuotaLimiter.md)

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
