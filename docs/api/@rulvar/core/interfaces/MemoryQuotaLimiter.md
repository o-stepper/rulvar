[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / MemoryQuotaLimiter

# Interface: MemoryQuotaLimiter

Defined in: [packages/core/src/model/quota.ts:198](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L198)

The in-process reference QuotaLimiter returned by memoryQuotaLimiter.

## Extends

- [`QuotaLimiter`](/api/@rulvar/core/interfaces/QuotaLimiter.md)

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

#### Inherited from

[`QuotaLimiter`](/api/@rulvar/core/interfaces/QuotaLimiter.md).[`reconcile`](/api/@rulvar/core/interfaces/QuotaLimiter.md#reconcile)

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

#### Inherited from

[`QuotaLimiter`](/api/@rulvar/core/interfaces/QuotaLimiter.md).[`reserve`](/api/@rulvar/core/interfaces/QuotaLimiter.md#reserve)

***

### snapshot()

```ts
snapshot(): QuotaWindowSnapshot[];
```

Defined in: [packages/core/src/model/quota.ts:200](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L200)

Current-window counters per rule; rolled-over windows read as zero.

#### Returns

[`QuotaWindowSnapshot`](/api/@rulvar/core/interfaces/QuotaWindowSnapshot.md)[]
