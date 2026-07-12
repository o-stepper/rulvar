[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / compactMessages

# Function: compactMessages()

```ts
function compactMessages(messages, summaryText): Msg[];
```

Defined in: [packages/core/src/runtime/compaction.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/compaction.ts#L72)

Applies a produced summary: everything after the first message (the
spawn prompt) is replaced by ONE user-role summary message. Compaction
fires at tool turn boundaries only, so the replaced span never splits
a tool-call/tool-result pair.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `messages` | [`Msg`](/api/@rulvar/core/interfaces/Msg.md)[] |
| `summaryText` | `string` |

## Returns

[`Msg`](/api/@rulvar/core/interfaces/Msg.md)[]
