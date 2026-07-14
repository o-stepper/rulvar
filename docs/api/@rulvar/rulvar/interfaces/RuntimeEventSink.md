[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RuntimeEventSink

# Interface: RuntimeEventSink

Defined in: `packages/core/dist/index.d.ts`

Minimal internal event sink; the typed WorkflowEvent envelope wraps it in M1-T10.

## Methods

### emit()

```ts
emit(body): void;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `body` | \{ `type`: `string`; \} & `Record`\&lt;`string`, `unknown`\&gt; |

#### Returns

`void`
