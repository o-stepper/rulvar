[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / runCli

# Function: runCli()

```ts
function runCli(argv, options): Promise<number>;
```

Defined in: [packages/cli/src/cli-main.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/cli-main.ts#L41)

@rulvar/cli: the rulvar shell (https://docs.rulvar.com/guide/cli).
M5 surface: run/resume/runs ls/inspect over the canonical
grammar, TUI progress on the event stream, interactive resolution of
suspended approvals and externals. plan/kb commands land M6+/M10;
createServer/createWorker land M8; the OTel exporter lands M5-T08.

The CLI builds exclusively from the public @rulvar/core API; adapters
and defaults come from the host's `rulvar.config.mjs` (or the
workflow module's exports), never from CLI dependencies.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `argv` | `string`[] |
| `options` | \{ `cwd`: `string`; `io`: [`CliIo`](/api/@rulvar/cli/interfaces/CliIo.md); \} |
| `options.cwd` | `string` |
| `options.io` | [`CliIo`](/api/@rulvar/cli/interfaces/CliIo.md) |

## Returns

`Promise`\&lt;`number`\&gt;
