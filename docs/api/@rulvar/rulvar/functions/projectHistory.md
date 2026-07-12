[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / projectHistory

# Function: projectHistory()

```ts
function projectHistory(messages, targetProvider): Msg[];
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Projects the canonical history into the target provider's view:
provider-raw parts of a DIFFERENT provider are omitted; everything
else (text, images, tool calls, tool results, compaction content)
passes through untouched. Messages whose parts all belong to another
provider vanish entirely rather than ride as empty messages.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `messages` | [`Msg`](/api/@rulvar/rulvar/interfaces/Msg.md)[] |
| `targetProvider` | `string` |

## Returns

[`Msg`](/api/@rulvar/rulvar/interfaces/Msg.md)[]
