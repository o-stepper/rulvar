[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-sqlite](/api/@rulvar/store-sqlite/index.md) / QUOTA\_BUSY\_TIMEOUT\_MS

# Variable: QUOTA\_BUSY\_TIMEOUT\_MS

```ts
const QUOTA_BUSY_TIMEOUT_MS: 2000 = 2_000;
```

Defined in: [packages/store-sqlite/src/quota.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/quota.ts#L58)

How long a runtime reserve/reconcile transaction waits for a
sibling process's transaction before the driver reports busy. Quota
admissions are short single-writer transactions; queueing here IS
the cross-process serialization working.
