[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / loadCliConfig

# Function: loadCliConfig()

```ts
function loadCliConfig(cwd): Promise<CliConfig>;
```

Defined in: [packages/cli/src/config.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L86)

Loads `rulvar.config.mjs`/`.js` from cwd; absent config is fine.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `cwd` | `string` |

## Returns

`Promise`\&lt;[`CliConfig`](/api/@rulvar/cli/interfaces/CliConfig.md)\&gt;
