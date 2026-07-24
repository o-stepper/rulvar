[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-postgres](/api/@rulvar/store-postgres/index.md) / PostgresStoreOptions

# Interface: PostgresStoreOptions

Defined in: [packages/store-postgres/src/store.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L100)

@rulvar/store-postgres: PostgresStore implementing JournalStore and
LeasableStore with fencing epochs over node-postgres, for
multi-process and multi-host deployments (RV-214). Payloads stay
opaque TEXT (A4); every run-scoped mutation serializes on a per-run
advisory transaction lock so the fence check and the guarded
mutation commit as one unit across hosts.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-max"></a> `max?` | `number` | Pool size ceiling; default 10. | [packages/store-postgres/src/store.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L117) |
| <a id="property-now"></a> `now?` | () => `number` | Injectable clock for lease-expiry tests. | [packages/store-postgres/src/store.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L119) |
| <a id="property-schema"></a> `schema?` | `string` | Schema holding this store's tables; default `public`. A non-public schema is created on boot (`CREATE SCHEMA IF NOT EXISTS`), which also gives tests and multi-tenant hosts cheap isolation. Must be a plain SQL identifier. | [packages/store-postgres/src/store.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L113) |
| <a id="property-ttlms"></a> `ttlMs?` | `number` | Lease ttl; default the Appendix A interim reference (60000 ms). | [packages/store-postgres/src/store.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L115) |
| <a id="property-url"></a> `url` | `string` | A postgres connection string (`postgres://user:password@host:port/database`). Every coordinating process and host points at the same database and schema. | [packages/store-postgres/src/store.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L106) |
