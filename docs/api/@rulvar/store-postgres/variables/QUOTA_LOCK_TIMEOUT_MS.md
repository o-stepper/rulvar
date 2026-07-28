[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-postgres](/api/@rulvar/store-postgres/index.md) / QUOTA\_LOCK\_TIMEOUT\_MS

# Variable: QUOTA\_LOCK\_TIMEOUT\_MS

```ts
const QUOTA_LOCK_TIMEOUT_MS: 2000 = 2_000;
```

Defined in: [packages/store-postgres/src/quota.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L76)

How long a reserve/reconcile transaction waits for the schema-wide
admission lock before postgres cancels the statement. Quota
admissions are short single-writer transactions; queueing here IS
the cross-host serialization working.
