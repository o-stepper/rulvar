[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RefEntryAppender

# Interface: RefEntryAppender

Defined in: [packages/core/src/journal/resolution.ts:269](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L269)

The append surface the arbiter drives (implemented by the Replayer).

## Methods

### appendRefEntry()

```ts
appendRefEntry(input): Promise<JournalEntry>;
```

Defined in: [packages/core/src/journal/resolution.ts:270](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L270)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `abandon?`: [`AbandonPayload`](/api/@rulvar/core/type-aliases/AbandonPayload.md); `kind`: `"resolution"` \| `"abandon"`; `ref`: `number`; `resolution?`: [`ResolutionPayload`](/api/@rulvar/core/type-aliases/ResolutionPayload.md); `scope`: `string`; `spanId`: `string`; \} |
| `input.abandon?` | [`AbandonPayload`](/api/@rulvar/core/type-aliases/AbandonPayload.md) |
| `input.kind` | `"resolution"` \| `"abandon"` |
| `input.ref` | `number` |
| `input.resolution?` | [`ResolutionPayload`](/api/@rulvar/core/type-aliases/ResolutionPayload.md) |
| `input.scope` | `string` |
| `input.spanId` | `string` |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)\&gt;
