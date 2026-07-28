[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-postgres](/api/@rulvar/store-postgres/index.md) / PostgresQuotaLimiterOptions

# Interface: PostgresQuotaLimiterOptions

Defined in: [packages/store-postgres/src/quota.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L86)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-max"></a> `max?` | `number` | Pool size ceiling; default 10. Admissions are short transactions. | [packages/store-postgres/src/quota.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L102) |
| <a id="property-now"></a> `now?` | () => `number` | Injectable clock for window tests. | [packages/store-postgres/src/quota.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L104) |
| <a id="property-rules"></a> `rules` | readonly [`QuotaRule`](/api/@rulvar/rulvar/interfaces/QuotaRule.md)[] | The shared rule set; must be identical across hosts. | [packages/store-postgres/src/quota.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L100) |
| <a id="property-schema"></a> `schema?` | `string` | Schema holding the two quota tables; default `public`. A non-public schema is created on boot. Must be a plain SQL identifier. | [packages/store-postgres/src/quota.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L98) |
| <a id="property-url"></a> `url` | `string` | A postgres connection string shared by every coordinating process and host (the database may also hold a PostgresStore; the tables do not collide). | [packages/store-postgres/src/quota.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L92) |
