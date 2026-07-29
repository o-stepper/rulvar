[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-postgres](/api/@rulvar/store-postgres/index.md) / QUOTA\_ADMISSION\_DEADLINE\_MS

# Variable: QUOTA\_ADMISSION\_DEADLINE\_MS

```ts
const QUOTA_ADMISSION_DEADLINE_MS: 5000 = 5_000;
```

Defined in: [packages/store-postgres/src/quota.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L88)

The default bound on one WHOLE admission path (RV506): lazy
bootstrap, pool checkout, and the admission transaction together.
`QUOTA_LOCK_TIMEOUT_MS` bounds only the lock-wait stage inside the
transaction; before RV506 a call could spend that bound once at
checkout and again at the lock and still not be refused. Overridable
per limiter through `admissionDeadlineMs`.
