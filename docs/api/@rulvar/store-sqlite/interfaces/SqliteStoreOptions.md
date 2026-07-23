[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-sqlite](/api/@rulvar/store-sqlite/index.md) / SqliteStoreOptions

# Interface: SqliteStoreOptions

Defined in: [packages/store-sqlite/src/store.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L93)

@rulvar/store-sqlite: SqliteStore implementing JournalStore and
LeasableStore with fencing epochs over the builtin node:sqlite driver;
the reference implementation for community stores (M5-T02).
Requires a Node.js with node:sqlite available
(unflagged in the 22.13+/23.4+ lines).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-now"></a> `now?` | () => `number` | Injectable clock for lease-expiry tests. | [packages/store-sqlite/src/store.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L106) |
| <a id="property-path"></a> `path` | `string` | Database file path, or ':memory:' for an in-process store. | [packages/store-sqlite/src/store.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L95) |
| <a id="property-ttlms"></a> `ttlMs?` | `number` | Lease ttl; default the Appendix A interim reference (60000 ms). An integer between 1 and 2147483647 ms (workers renew on Node timers at ttl/3), refused as a ConfigError BEFORE the database opens: zero or a negative made every lease born expired (a second owner could take over immediately), NaN failed the first acquire with a raw sqlite NOT NULL error, and Infinity never expired (v1.35.0 review P2-4). | [packages/store-sqlite/src/store.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/store.ts#L104) |
