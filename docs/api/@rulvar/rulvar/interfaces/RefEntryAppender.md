[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RefEntryAppender

# Interface: RefEntryAppender

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The append surface the arbiter drives (implemented by the Replayer).

## Methods

### appendRefEntry()

```ts
appendRefEntry(input): Promise<JournalEntry>;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `abandon?`: [`AbandonPayload`](/api/@rulvar/rulvar/type-aliases/AbandonPayload.md); `kind`: `"resolution"` \| `"abandon"`; `ref`: `number`; `resolution?`: [`ResolutionPayload`](/api/@rulvar/rulvar/type-aliases/ResolutionPayload.md); `scope`: `string`; `spanId`: `string`; \} |
| `input.abandon?` | [`AbandonPayload`](/api/@rulvar/rulvar/type-aliases/AbandonPayload.md) |
| `input.kind` | `"resolution"` \| `"abandon"` |
| `input.ref` | `number` |
| `input.resolution?` | [`ResolutionPayload`](/api/@rulvar/rulvar/type-aliases/ResolutionPayload.md) |
| `input.scope` | `string` |
| `input.spanId` | `string` |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)\&gt;
