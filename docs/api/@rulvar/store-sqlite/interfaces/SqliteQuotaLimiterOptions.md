[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-sqlite](/api/@rulvar/store-sqlite/index.md) / SqliteQuotaLimiterOptions

# Interface: SqliteQuotaLimiterOptions

Defined in: [packages/store-sqlite/src/quota.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/quota.ts#L90)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-now"></a> `now?` | () => `number` | Injectable clock for window tests. | [packages/store-sqlite/src/quota.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/quota.ts#L96) |
| <a id="property-path"></a> `path` | `string` | Database file path shared by every coordinating process. | [packages/store-sqlite/src/quota.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/quota.ts#L92) |
| <a id="property-rules"></a> `rules` | readonly [`QuotaRule`](/api/@rulvar/rulvar/interfaces/QuotaRule.md)[] | The shared rule set; must be identical across processes. | [packages/store-sqlite/src/quota.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/store-sqlite/src/quota.ts#L94) |
