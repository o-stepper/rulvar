[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / renderProgress

# Function: renderProgress()

```ts
function renderProgress(events, options?): Promise<void>;
```

Defined in: [packages/rulvar/src/render-progress.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/render-progress.ts#L26)

Renders events until the stream ends (the run settled). Returns after
the final run:end line.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `events` | `AsyncIterable`\&lt;[`WorkflowEvent`](/api/@rulvar/rulvar/type-aliases/WorkflowEvent.md)\&gt; |
| `options?` | [`RenderProgressOptions`](/api/@rulvar/rulvar/interfaces/RenderProgressOptions.md) |

## Returns

`Promise`\&lt;`void`\&gt;
