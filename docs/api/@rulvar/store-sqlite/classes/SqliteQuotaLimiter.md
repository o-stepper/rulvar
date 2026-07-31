[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-sqlite](/api/@rulvar/store-sqlite/index.md) / SqliteQuotaLimiter

# Class: SqliteQuotaLimiter

Defined in: [packages/store-sqlite/src/quota.ts:105](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/quota.ts#L105)

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

Defined in: [packages/store-sqlite/src/quota.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/quota.ts#L114)

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

Defined in: [packages/store-sqlite/src/quota.ts:358](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/quota.ts#L358)

#### Returns

`void`

***

### reconcile()

```ts
reconcile(
   reservationId, 
   usage, 
actual?): Promise<void>;
```

Defined in: [packages/store-sqlite/src/quota.ts:254](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/quota.ts#L254)

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

#### Implementation of

[`QuotaLimiter`](/api/@rulvar/rulvar/interfaces/QuotaLimiter.md).[`reconcile`](/api/@rulvar/rulvar/interfaces/QuotaLimiter.md#reconcile)

***

### release()

```ts
release(reservationId): Promise<void>;
```

Defined in: [packages/store-sqlite/src/quota.ts:304](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/quota.ts#L304)

Cancels an UNUSED admission (RV1103, the optional SPI method from
RV1013): exactly what admission consumed, the admitted requests
and the token estimate, returns to the window, from any process
sharing the file. Unknown ids, a double release, and a release
after reconcile are no-ops (the row is gone); a rolled-over window
already aged the estimate out, so only the row is deleted; a
released id settles nothing afterwards. Mirrors
`memoryQuotaLimiter.release` verdict for verdict.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `reservationId` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`QuotaLimiter`](/api/@rulvar/rulvar/interfaces/QuotaLimiter.md).[`release`](/api/@rulvar/rulvar/interfaces/QuotaLimiter.md#release)

***

### reserve()

```ts
reserve(request): Promise<QuotaDecision>;
```

Defined in: [packages/store-sqlite/src/quota.ts:191](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/quota.ts#L191)

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

Defined in: [packages/store-sqlite/src/quota.ts:340](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/quota.ts#L340)

Current-window counters per rule, for telemetry and referees.

#### Returns

\{
  `requests`: `number`;
  `rule`: [`QuotaRule`](/api/@rulvar/rulvar/interfaces/QuotaRule.md);
  `tokens`: `number`;
  `windowStart`: `number`;
\}[]
