[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-sqlite](/api/@rulvar/store-sqlite/index.md) / SqliteStoreOptions

# Interface: SqliteStoreOptions

Defined in: [packages/store-sqlite/src/store.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L37)

@rulvar/store-sqlite: SqliteStore implementing JournalStore and
LeasableStore with fencing epochs over the builtin node:sqlite driver;
the reference implementation for community stores (M5-T02).
Requires a Node.js with node:sqlite available
(unflagged in the 22.13+/23.4+ lines).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-now"></a> `now?` | () => `number` | Injectable clock for lease-expiry tests. | [packages/store-sqlite/src/store.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L43) |
| <a id="property-path"></a> `path` | `string` | Database file path, or ':memory:' for an in-process store. | [packages/store-sqlite/src/store.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L39) |
| <a id="property-ttlms"></a> `ttlMs?` | `number` | Lease ttl; default the Appendix A interim reference (60000 ms). | [packages/store-sqlite/src/store.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L41) |
