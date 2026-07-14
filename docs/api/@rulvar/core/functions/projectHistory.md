[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / projectHistory

# Function: projectHistory()

```ts
function projectHistory(messages, targetProvider): Msg[];
```

Defined in: [packages/core/src/model/projector.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/projector.ts#L44)

Projects the canonical history into the target provider's view:
provider-raw parts of a DIFFERENT provider are omitted; everything
else (text, images, tool calls, tool results, compaction content)
passes through untouched. Messages whose parts all belong to another
provider vanish entirely rather than ride as empty messages.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `messages` | [`Msg`](/api/@rulvar/core/interfaces/Msg.md)[] |
| `targetProvider` | `string` |

## Returns

[`Msg`](/api/@rulvar/core/interfaces/Msg.md)[]
