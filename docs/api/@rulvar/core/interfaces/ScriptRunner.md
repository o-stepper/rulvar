[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ScriptRunner

# Interface: ScriptRunner

Defined in: [packages/core/src/runner/inprocess.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/inprocess.ts#L27)

## Methods

### execute()

```ts
execute<A, R>(
   wf, 
   ctx, 
args): Promise<R>;
```

Defined in: [packages/core/src/runner/inprocess.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/inprocess.ts#L28)

#### Type Parameters

| Type Parameter |
| ------ |
| `A` |
| `R` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `wf` | \| [`CompiledWorkflow`](/api/@rulvar/core/interfaces/CompiledWorkflow.md) \| [`Workflow`](/api/@rulvar/core/interfaces/Workflow.md)\&lt;`A`, `R`\&gt; |
| `ctx` | [`Ctx`](/api/@rulvar/core/interfaces/Ctx.md)\&lt;`never`\&gt; |
| `args` | `A` |

#### Returns

`Promise`\&lt;`R`\&gt;
