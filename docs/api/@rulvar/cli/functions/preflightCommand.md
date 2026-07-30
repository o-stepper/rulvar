[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / preflightCommand

# Function: preflightCommand()

```ts
function preflightCommand(argv, context): Promise<number>;
```

Defined in: [packages/cli/src/commands.ts:1057](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/commands.ts#L1057)

rulvar preflight (the experiment-review P2.2; grammar in grammar.ts):
the effective-config linter and dry-run estimator. Loads the SAME
config, module, and run-profile merge `rulvar run` would assemble,
but constructs no engine, opens no store, and dispatches nothing:
the report is computed by preflightEstimate over options alone, so
the command cannot pay for a single provider token by construction.
The declared spawn wave comes from the `preflight` export of the
config or workflow module (module wins), and --spawns JSON overrides
it from the command line. --json prints the machine-readable report.
Exit 1 when any finding has severity 'error' (the linter contract:
green preflight means the run can at least start), 0 otherwise.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `argv` | `string`[] |
| `context` | [`CommandContext`](/api/@rulvar/cli/interfaces/CommandContext.md) |

## Returns

`Promise`\&lt;`number`\&gt;
