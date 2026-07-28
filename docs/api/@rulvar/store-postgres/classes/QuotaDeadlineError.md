[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-postgres](/api/@rulvar/store-postgres/index.md) / QuotaDeadlineError

# Class: QuotaDeadlineError

Defined in: [packages/store-postgres/src/quota.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L101)

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

Defined in: [packages/store-postgres/src/quota.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L109)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `deadlineMs` | `number` |
| `schema` | `string` |
| `phase` | `"acquire"` \| `"transaction"` |

#### Returns

`QuotaDeadlineError`

#### Overrides

```ts
Error.constructor
```

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-deadlinems"></a> `deadlineMs` | `readonly` | `number` | The deadline that expired, in milliseconds. | [packages/store-postgres/src/quota.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L103) |
| <a id="property-phase"></a> `phase` | `readonly` | `"acquire"` \| `"transaction"` | Where the path stood: acquiring a connection, or mid-transaction. | [packages/store-postgres/src/quota.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L107) |
| <a id="property-schema"></a> `schema` | `readonly` | `string` | The schema whose admission missed it. | [packages/store-postgres/src/quota.ts:105](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L105) |
