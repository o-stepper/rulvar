[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-postgres](/api/@rulvar/store-postgres/index.md) / QuotaDeadlineError

# Class: QuotaDeadlineError

Defined in: [packages/store-postgres/src/quota.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L104)

Thrown when one quota admission (reserve or reconcile) misses the
full-path deadline. It surfaces exactly where the lock timeout
surfaces, as a limiter error consumed by the engine's
`onLimiterError` policy: `'deny'` (the default) turns it into a
retryable transport-class denial, so nothing dispatches unpoliced.
The connection the refused call held is destroyed, never returned
dirty to the pool; a transaction cut mid-flight is rolled back by
the server. Like any client-side timeout, expiry exactly at the
commit boundary can leave a committed reservation behind; it ages
out with its window unreconciled, the same bounded residue a
crashed process leaves.

## Extends

- `Error`

## Constructors

### Constructor

```ts
new QuotaDeadlineError(
   deadlineMs, 
   schema, 
   phase): QuotaDeadlineError;
```

Defined in: [packages/store-postgres/src/quota.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L118)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `deadlineMs` | `number` |
| `schema` | `string` |
| `phase` | `"bootstrap"` \| `"acquire"` \| `"transaction"` |

#### Returns

`QuotaDeadlineError`

#### Overrides

```ts
Error.constructor
```

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-deadlinems"></a> `deadlineMs` | `readonly` | `number` | The deadline that expired, in milliseconds. | [packages/store-postgres/src/quota.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L106) |
| <a id="property-phase"></a> `phase` | `readonly` | `"bootstrap"` \| `"acquire"` \| `"transaction"` | Where the path stood: inside the schema bootstrap transaction, waiting for a pooled connection, or mid-admission-transaction. The message narrates only what actually happened to a connection in that phase (RV608): a refusal while WAITING held nothing, so it destroyed nothing. | [packages/store-postgres/src/quota.ts:116](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L116) |
| <a id="property-schema"></a> `schema` | `readonly` | `string` | The schema whose admission missed it. | [packages/store-postgres/src/quota.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L108) |
