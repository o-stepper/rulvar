[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / assembleEngine

# Function: assembleEngine()

```ts
function assembleEngine(options): AssembledCli;
```

Defined in: [packages/cli/src/engine-assembly.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/engine-assembly.ts#L64)

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `config`: [`CliConfig`](/api/@rulvar/cli/interfaces/CliConfig.md); `cwd`: `string`; `module?`: [`LoadedWorkflowModule`](/api/@rulvar/cli/interfaces/LoadedWorkflowModule.md); `profile?`: `string`; `repairOnLoad?`: `boolean`; `storePath?`: `string`; \} | - |
| `options.config` | [`CliConfig`](/api/@rulvar/cli/interfaces/CliConfig.md) | - |
| `options.cwd` | `string` | - |
| `options.module?` | [`LoadedWorkflowModule`](/api/@rulvar/cli/interfaces/LoadedWorkflowModule.md) | - |
| `options.profile?` | `string` | - |
| `options.repairOnLoad?` | `boolean` | RV1512: disarm the JSONL torn-tail repair on load (audit reads). |
| `options.storePath?` | `string` | - |

## Returns

[`AssembledCli`](/api/@rulvar/cli/interfaces/AssembledCli.md)
