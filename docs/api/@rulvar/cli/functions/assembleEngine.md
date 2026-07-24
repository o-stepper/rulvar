[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / assembleEngine

# Function: assembleEngine()

```ts
function assembleEngine(options): AssembledCli;
```

Defined in: [packages/cli/src/engine-assembly.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/engine-assembly.ts#L49)

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `config`: [`CliConfig`](/api/@rulvar/cli/interfaces/CliConfig.md); `cwd`: `string`; `module?`: [`LoadedWorkflowModule`](/api/@rulvar/cli/interfaces/LoadedWorkflowModule.md); `profile?`: `string`; `storePath?`: `string`; \} |
| `options.config` | [`CliConfig`](/api/@rulvar/cli/interfaces/CliConfig.md) |
| `options.cwd` | `string` |
| `options.module?` | [`LoadedWorkflowModule`](/api/@rulvar/cli/interfaces/LoadedWorkflowModule.md) |
| `options.profile?` | `string` |
| `options.storePath?` | `string` |

## Returns

[`AssembledCli`](/api/@rulvar/cli/interfaces/AssembledCli.md)
