[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / validateEngineQuotaConfig

# Function: validateEngineQuotaConfig()

```ts
function validateEngineQuotaConfig(config, site?): void;
```

Defined in: `packages/core/dist/index.d.ts`

Validates createEngine's quota config as a typed ConfigError before
any run could dispatch under a malformed limiter (the intake
discipline every engine option follows).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | \| [`EngineQuotaConfig`](/api/@rulvar/rulvar/interfaces/EngineQuotaConfig.md) \| `undefined` |
| `site?` | `string` |

## Returns

`void`
