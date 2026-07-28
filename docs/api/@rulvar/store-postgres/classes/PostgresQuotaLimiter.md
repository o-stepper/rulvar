[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-postgres](/api/@rulvar/store-postgres/index.md) / PostgresQuotaLimiter

# Class: PostgresQuotaLimiter

Defined in: [packages/store-postgres/src/quota.ts:126](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L126)

The multi-host reference implementation of the core QuotaLimiter
SPI: engine processes pointing instances at ONE database and schema
(a PostgresStore's database or their own) enforce one global
provider quota. Admission consumes the window counters inside a
single transaction serialized on a schema-wide advisory transaction
lock, so two processes or HOSTS can never both take the last slot;
reservations are rows, so `reconcile` settles a grant from any host;
both tables are lazily pruned to the current and previous accounting
window. The rule model, the fixed epoch-aligned one-minute windows,
and the admission decision are the core's own exported functions, so
this limiter, `memoryQuotaLimiter`, and `SqliteQuotaLimiter` agree
on every verdict. The `rules` MUST be identical across coordinating
processes (buckets key on rule content). Runtime contention queues
on the advisory lock (a hot limiter is EXPECTED to serialize); a
call still waiting past `QUOTA_LOCK_TIMEOUT_MS` throws, and the
engine's `onLimiterError` policy decides what that means. Call
`close()` when done.

## Implements

- [`QuotaLimiter`](/api/@rulvar/rulvar/interfaces/QuotaLimiter.md)

## Constructors

### Constructor

```ts
new PostgresQuotaLimiter(options): PostgresQuotaLimiter;
```

Defined in: [packages/store-postgres/src/quota.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L133)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`PostgresQuotaLimiterOptions`](/api/@rulvar/store-postgres/interfaces/PostgresQuotaLimiterOptions.md) |

#### Returns

`PostgresQuotaLimiter`

## Methods

### close()

```ts
close(): Promise<void>;
```

Defined in: [packages/store-postgres/src/quota.ts:370](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L370)

#### Returns

`Promise`\&lt;`void`\&gt;

***

### reconcile()

```ts
reconcile(reservationId, usage): Promise<void>;
```

Defined in: [packages/store-postgres/src/quota.ts:304](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L304)

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

Defined in: [packages/store-postgres/src/quota.ts:246](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L246)

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
snapshot(): Promise<{
  requests: number;
  rule: QuotaRule;
  tokens: number;
  windowStart: number;
}[]>;
```

Defined in: [packages/store-postgres/src/quota.ts:343](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L343)

Current-window counters per rule, for telemetry and referees.

#### Returns

`Promise`\<\{
  `requests`: `number`;
  `rule`: [`QuotaRule`](/api/@rulvar/rulvar/interfaces/QuotaRule.md);
  `tokens`: `number`;
  `windowStart`: `number`;
\}[]\>
