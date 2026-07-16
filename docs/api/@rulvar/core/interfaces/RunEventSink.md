[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunEventSink

# Interface: RunEventSink

Defined in: [packages/core/src/engine/ctx.ts:575](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L575)

Span-aware event sink: bodies are stamped into the WorkflowEvent
envelope by the per-run EventBus (M1-T10); spanId defaults to the run
root span when omitted.

## Methods

### emit()

```ts
emit(
   body, 
   spanId?, 
   replayed?): void;
```

Defined in: [packages/core/src/engine/ctx.ts:576](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L576)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `body` | \{ `type`: `string`; \} & `Record`\&lt;`string`, `unknown`\&gt; |
| `spanId?` | `string` |
| `replayed?` | `boolean` |

#### Returns

`void`
