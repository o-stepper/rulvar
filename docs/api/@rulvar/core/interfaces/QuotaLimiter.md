[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / QuotaLimiter

# Interface: QuotaLimiter

Defined in: [packages/core/src/l0/spi/quota.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L85)

The shared rate/quota limiter seam; see the module contract above.

## Extended by

- [`MemoryQuotaLimiter`](/api/@rulvar/core/interfaces/MemoryQuotaLimiter.md)

## Methods

### reconcile()

```ts
reconcile(reservationId, usage): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/quota.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L87)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `reservationId` | `string` |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

***

### reserve()

```ts
reserve(request): Promise<QuotaDecision>;
```

Defined in: [packages/core/src/l0/spi/quota.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/quota.ts#L86)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`QuotaReservationRequest`](/api/@rulvar/core/interfaces/QuotaReservationRequest.md) |

#### Returns

`Promise`\&lt;[`QuotaDecision`](/api/@rulvar/core/type-aliases/QuotaDecision.md)\&gt;
