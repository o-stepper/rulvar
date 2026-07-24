[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / validateEngineQuotaConfig

# Function: validateEngineQuotaConfig()

```ts
function validateEngineQuotaConfig(config, site?): void;
```

Defined in: [packages/core/src/model/quota.ts:339](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/quota.ts#L339)

Validates createEngine's quota config as a typed ConfigError before
any run could dispatch under a malformed limiter (the intake
discipline every engine option follows).

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `config` | \| [`EngineQuotaConfig`](/api/@rulvar/core/interfaces/EngineQuotaConfig.md) \| `undefined` | `undefined` |
| `site` | `string` | `'createEngine quota'` |

## Returns

`void`
