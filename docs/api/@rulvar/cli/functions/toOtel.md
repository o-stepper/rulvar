[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / toOtel

# Function: toOtel()

```ts
function toOtel(
   run, 
   tracer, 
options?): Promise<number>;
```

Defined in: [packages/cli/src/otel.ts:183](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/otel.ts#L183)

Exports one run's event stream onto a tracer. The run's events are
consumed in seq order; span openers start spans, the matching
closers end them, and payload-only events attach as span events on
the innermost open span. Returns the number of spans created. Every
terminal path exports, the unsettled ones included (RV1106): a
rejecting `result` never fails an export the stream already
completed, it only marks any leftover span with the refusal.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `run` | \{ `events`: `AsyncIterable`\&lt;[`WorkflowEvent`](/api/@rulvar/rulvar/type-aliases/WorkflowEvent.md)\&gt;; `result`: `Promise`\&lt;[`RunOutcome`](/api/@rulvar/rulvar/type-aliases/RunOutcome.md)\&lt;`unknown`\&gt;\&gt;; `runId`: `string`; \} |
| `run.events` | `AsyncIterable`\&lt;[`WorkflowEvent`](/api/@rulvar/rulvar/type-aliases/WorkflowEvent.md)\&gt; |
| `run.result` | `Promise`\&lt;[`RunOutcome`](/api/@rulvar/rulvar/type-aliases/RunOutcome.md)\&lt;`unknown`\&gt;\&gt; |
| `run.runId` | `string` |
| `tracer` | [`TracerLike`](/api/@rulvar/cli/interfaces/TracerLike.md) |
| `options` | [`ToOtelOptions`](/api/@rulvar/cli/interfaces/ToOtelOptions.md) |

## Returns

`Promise`\&lt;`number`\&gt;
