[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-sqlite](/api/@rulvar/store-sqlite/index.md) / SqliteQuotaLimiter

# Class: SqliteQuotaLimiter

Defined in: [packages/store-sqlite/src/quota.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/quota.ts#L117)

The cross-process reference implementation of the core QuotaLimiter
SPI: engine processes pointing instances at ONE database file (this
store's file or its own) enforce one global provider quota.
Admission consumes the window counters inside a single
`BEGIN IMMEDIATE` transaction, so two processes can never both take
the last slot; reservations are rows, so `reconcile` settles a
grant from any process; both tables are lazily pruned to the
current and previous accounting window. The rule model, the fixed
epoch-aligned one-minute windows, and the admission decision are
the core's own exported functions, so this limiter and
`memoryQuotaLimiter` agree on every verdict. The `rules` MUST be
identical across coordinating processes (buckets key on rule
content). Runtime contention queues briefly on the connection's
busy_timeout (a hot limiter is EXPECTED to serialize); a call still
busy past the bound throws, and the engine's `onLimiterError`
policy decides what that means. Call `close()` when done.

## Implements

- [`QuotaLimiter`](/api/@rulvar/rulvar/interfaces/QuotaLimiter.md)

## Constructors

### Constructor

```ts
new SqliteQuotaLimiter(options): SqliteQuotaLimiter;
```

Defined in: [packages/store-sqlite/src/quota.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/quota.ts#L122)

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

Defined in: [packages/store-sqlite/src/quota.ts:279](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/quota.ts#L279)

#### Returns

`void`

***

### reconcile()

```ts
reconcile(reservationId, usage): Promise<void>;
```

Defined in: [packages/store-sqlite/src/quota.ts:224](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/quota.ts#L224)

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

Defined in: [packages/store-sqlite/src/quota.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/quota.ts#L166)

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

Defined in: [packages/store-sqlite/src/quota.ts:261](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/quota.ts#L261)

Current-window counters per rule, for telemetry and referees.

#### Returns

\{
  `requests`: `number`;
  `rule`: [`QuotaRule`](/api/@rulvar/rulvar/interfaces/QuotaRule.md);
  `tokens`: `number`;
  `windowStart`: `number`;
\}[]
