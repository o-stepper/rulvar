[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/planner](/api/@rulvar/planner/index.md) / WorkerSandboxRunner

# Class: WorkerSandboxRunner

Defined in: [packages/planner/src/sandbox-runner.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/sandbox-runner.ts#L50)

Accepts CompiledWorkflow ONLY: feeding a closure is a type error.

## Implements

- [`ScriptRunner`](/api/@rulvar/rulvar/interfaces/ScriptRunner.md)

## Constructors

### Constructor

```ts
new WorkerSandboxRunner(options?): WorkerSandboxRunner;
```

Defined in: [packages/planner/src/sandbox-runner.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/sandbox-runner.ts#L56)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options?` | [`WorkerSandboxRunnerOptions`](/api/@rulvar/planner/interfaces/WorkerSandboxRunnerOptions.md) |

#### Returns

`WorkerSandboxRunner`

## Methods

### execute()

```ts
execute<A, R>(
   wf, 
   ctx, 
args): Promise<R>;
```

Defined in: [packages/planner/src/sandbox-runner.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/sandbox-runner.ts#L63)

#### Type Parameters

| Type Parameter |
| ------ |
| `A` |
| `R` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `wf` | [`CompiledWorkflow`](/api/@rulvar/rulvar/interfaces/CompiledWorkflow.md) |
| `ctx` | [`Ctx`](/api/@rulvar/rulvar/interfaces/Ctx.md)\&lt;`never`\&gt; |
| `args` | `A` |

#### Returns

`Promise`\&lt;`R`\&gt;

#### Implementation of

[`ScriptRunner`](/api/@rulvar/rulvar/interfaces/ScriptRunner.md).[`execute`](/api/@rulvar/rulvar/interfaces/ScriptRunner.md#execute)
