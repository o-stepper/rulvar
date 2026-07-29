[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-postgres](/api/@rulvar/store-postgres/index.md) / PostgresQuotaLimiterOptions

# Interface: PostgresQuotaLimiterOptions

Defined in: [packages/store-postgres/src/quota.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L203)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-acceptrulesupdate"></a> `acceptRulesUpdate?` | `boolean` | Rules rotation opt-in: rewrite the schema's recorded rules fingerprint with this instance's own at boot instead of refusing on a mismatch. Procedure: enable on the NEW deployment, roll every host to the new rule set, then remove the flag so drift is refused again. Default false. | [packages/store-postgres/src/quota.ts:242](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L242) |
| <a id="property-admissiondeadlinems"></a> `admissionDeadlineMs?` | `number` | Bound on one whole admission path (bootstrap, pool checkout, and the admission transaction together); default `QUOTA_ADMISSION_DEADLINE_MS` (5000). Must be an integer strictly greater than `QUOTA_LOCK_TIMEOUT_MS`, which bounds only the lock-wait stage inside it. Expiry throws `QuotaDeadlineError` into the engine's `onLimiterError` policy and destroys the connection the refused call held. | [packages/store-postgres/src/quota.ts:234](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L234) |
| <a id="property-max"></a> `max?` | `number` | Pool size ceiling; default 10. Admissions are short transactions. | [packages/store-postgres/src/quota.ts:224](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L224) |
| <a id="property-now"></a> `now?` | () => `number` | Injectable clock for window tests. | [packages/store-postgres/src/quota.ts:244](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L244) |
| <a id="property-rules"></a> `rules` | readonly [`QuotaRule`](/api/@rulvar/rulvar/interfaces/QuotaRule.md)[] | The shared rule set; must be identical across hosts. Enforced: the schema records `quotaRulesFingerprint(rules)` on first boot, and an instance whose fingerprint differs is refused with a typed `ConfigError` naming both hashes. | [packages/store-postgres/src/quota.ts:222](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L222) |
| <a id="property-schema"></a> `schema?` | `string` | Schema holding the two quota tables; default `public`. A non-public schema is created on boot. Must be a plain SQL identifier. | [packages/store-postgres/src/quota.ts:215](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L215) |
| <a id="property-url"></a> `url` | `string` | A postgres connection string shared by every coordinating process and host (the database may also hold a PostgresStore; the tables do not collide). | [packages/store-postgres/src/quota.ts:209](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L209) |
