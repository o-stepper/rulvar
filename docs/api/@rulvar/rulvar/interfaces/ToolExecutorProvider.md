[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ToolExecutorProvider

# Interface: ToolExecutorProvider

Defined in: `packages/core/dist/index.d.ts`

The isolated tool executor seam. A provider runs one dispatch to its
JSON result. A thrown error becomes the call's error tool result, never
a run abort: an executor failure (non-zero exit, timeout kill,
unparseable output, infrastructure error) is surfaced to the model
exactly like any other tool error, so the loop can react and the run
stays durable.

## Methods

### run()

```ts
run(request): Promise<Json>;
```

Defined in: `packages/core/dist/index.d.ts`

Runs one dispatch to its JSON result; throws to signal tool failure.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`IsolatedExecRequest`](/api/@rulvar/rulvar/interfaces/IsolatedExecRequest.md) |

#### Returns

`Promise`\&lt;[`Json`](/api/@rulvar/rulvar/type-aliases/Json.md)\&gt;
