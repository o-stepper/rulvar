[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-sqlite](/api/@rulvar/store-sqlite/index.md) / SqliteQuotaLimiter

# Class: SqliteQuotaLimiter

Defined in: [packages/store-sqlite/src/quota.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/quota.ts#L99)

The shared rate/quota limiter seam; see the module contract above.

## Implements

- [`QuotaLimiter`](/api/@rulvar/rulvar/interfaces/QuotaLimiter.md)

## Constructors

### Constructor

```ts
new SqliteQuotaLimiter(options): SqliteQuotaLimiter;
```

Defined in: [packages/store-sqlite/src/quota.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/quota.ts#L104)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`SqliteQuotaLimiterOptions`](/api/@rulvar/store-sqlite/interfaces/SqliteQuotaLimiterOptions.md) |

#### Returns

`SqliteQuotaLimiter`

## Methods

### close()

```ts
close(): void;
```

Defined in: [packages/store-sqlite/src/quota.ts:261](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/quota.ts#L261)

#### Returns

`void`

***

### reconcile()

```ts
reconcile(reservationId, usage): Promise<void>;
```

Defined in: [packages/store-sqlite/src/quota.ts:206](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/quota.ts#L206)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `reservationId` | `string` |
| `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`QuotaLimiter`](/api/@rulvar/rulvar/interfaces/QuotaLimiter.md).[`reconcile`](/api/@rulvar/rulvar/interfaces/QuotaLimiter.md#reconcile)

***

### reserve()

```ts
reserve(request): Promise<QuotaDecision>;
```

Defined in: [packages/store-sqlite/src/quota.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/quota.ts#L148)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`QuotaReservationRequest`](/api/@rulvar/rulvar/interfaces/QuotaReservationRequest.md) |

#### Returns

`Promise`\&lt;[`QuotaDecision`](/api/@rulvar/rulvar/type-aliases/QuotaDecision.md)\&gt;

#### Implementation of

[`QuotaLimiter`](/api/@rulvar/rulvar/interfaces/QuotaLimiter.md).[`reserve`](/api/@rulvar/rulvar/interfaces/QuotaLimiter.md#reserve)

***

### snapshot()

```ts
snapshot(): {
  requests: number;
  rule: QuotaRule;
  tokens: number;
  windowStart: number;
}[];
```

Defined in: [packages/store-sqlite/src/quota.ts:243](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/quota.ts#L243)

Current-window counters per rule, for telemetry and referees.

#### Returns

\{
  `requests`: `number`;
  `rule`: [`QuotaRule`](/api/@rulvar/rulvar/interfaces/QuotaRule.md);
  `tokens`: `number`;
  `windowStart`: `number`;
\}[]
