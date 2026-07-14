[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/planner](/api/@rulvar/planner/index.md) / runSandboxDeterminism

# Function: runSandboxDeterminism()

```ts
function runSandboxDeterminism(options): Promise<JournalEntry[]>;
```

Defined in: [packages/planner/src/cassettes.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/cassettes.ts#L48)

One fresh sandbox-determinism run on a fresh store; two invocations
with the same worker produce byte-identical normalized journals (the
cassette assertion). The adapter factory keeps @rulvar/testing out of
the planner's dependency graph.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `makeAdapter`: () => `unknown`; `modelRef`: `string`; `workerUrl`: `URL`; \} |
| `options.makeAdapter` | () => `unknown` |
| `options.modelRef` | `string` |
| `options.workerUrl` | `URL` |

## Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;
