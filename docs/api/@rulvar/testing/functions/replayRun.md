[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / replayRun

# Function: replayRun()

```ts
function replayRun<A, R>(
   wf, 
   args, 
   options): Promise<{
  outcome: RunOutcome<unknown>;
  preview: ResumePreview;
}>;
```

Defined in: [packages/testing/src/replay-strict.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/replay-strict.ts#L52)

## Type Parameters

| Type Parameter |
| ------ |
| `A` |
| `R` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `wf` | [`Workflow`](/api/@rulvar/rulvar/interfaces/Workflow.md)\&lt;`A`, `R`\&gt; |
| `args` | `A` |
| `options` | [`ReplayRunOptions`](/api/@rulvar/testing/interfaces/ReplayRunOptions.md) |

## Returns

`Promise`\<\{
  `outcome`: [`RunOutcome`](/api/@rulvar/rulvar/type-aliases/RunOutcome.md)\&lt;`unknown`\&gt;;
  `preview`: [`ResumePreview`](/api/@rulvar/rulvar/interfaces/ResumePreview.md);
\}\>
