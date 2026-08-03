[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RuntimeEventSink

# Interface: RuntimeEventSink

Defined in: [packages/core/src/runtime/agent-loop.ts:312](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L312)

Minimal internal event sink; the typed WorkflowEvent envelope wraps it in M1-T10.

## Methods

### emit()

```ts
emit(body): void;
```

Defined in: [packages/core/src/runtime/agent-loop.ts:313](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L313)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `body` | \{ `type`: `string`; \} & `Record`\&lt;`string`, `unknown`\&gt; |

#### Returns

`void`
