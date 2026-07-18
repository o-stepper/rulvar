[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / progress

# Function: progress()

```ts
function progress(source, options?): ProgressHandle;
```

Defined in: [packages/rulvar/src/live-progress.ts:699](https://github.com/o-stepper/rulvar/blob/main/packages/rulvar/src/live-progress.ts#L699)

Attaches a live progress view to a run and returns its handle. Accepts
a RunHandle (subscribes through `on()`, leaving `handle.events` free
for the host, and enriches the final frame from `RunOutcome.cost`;
`orchestrate` returns exactly such a handle, so
`progress(orchestrate(...))` composes directly), a promise resolving
to a handle (for wrappers that construct one asynchronously), or a
raw WorkflowEvent iterable (the gapless path for resumes:
`progress(resumed.events)`; note it consumes that one-shot iterable).
The view auto-stops when the run settles.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `source` | [`ProgressSource`](/api/@rulvar/rulvar/type-aliases/ProgressSource.md) |
| `options?` | [`ProgressOptions`](/api/@rulvar/rulvar/interfaces/ProgressOptions.md) |

## Returns

[`ProgressHandle`](/api/@rulvar/rulvar/interfaces/ProgressHandle.md)
