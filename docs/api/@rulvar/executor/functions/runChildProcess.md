[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / runChildProcess

# Function: runChildProcess()

```ts
function runChildProcess(spec): Promise<ChildResult>;
```

Defined in: [packages/executor/src/child.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/child.ts#L57)

Spawns one child and resolves with its captured output and exit status,
or rejects if the process could not be spawned at all (e.g. the command
is a bare name and PATH is not in `env`, so it cannot be resolved). A
child that exits non-zero or is killed resolves normally; interpreting
that is the caller's job.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`ChildSpec`](/api/@rulvar/executor/interfaces/ChildSpec.md) |

## Returns

`Promise`\&lt;[`ChildResult`](/api/@rulvar/executor/interfaces/ChildResult.md)\&gt;
