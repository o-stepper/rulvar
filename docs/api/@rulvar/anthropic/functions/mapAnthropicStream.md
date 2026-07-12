[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/anthropic](/api/@rulvar/anthropic/index.md) / mapAnthropicStream

# Function: mapAnthropicStream()

```ts
function mapAnthropicStream(
   stream, 
   ids, 
   emit, 
options?): Promise<TurnMapping>;
```

Defined in: [packages/anthropic/src/wire.ts:427](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/wire.ts#L427)

Maps one Messages API stream into ChatEvents. Emits an early usage event
from message_start (the input side is known immediately) and exactly one
terminal finish unless the turn paused (pause_turn) or errored.
`carryRetained` holds thinking blocks from earlier pause_turn
continuations of the same turn so the terminal finish ships the whole
turn's retention payload (M4-T02).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `stream` | `AsyncIterable`\&lt;[`AnthropicStreamEvent`](/api/@rulvar/anthropic/type-aliases/AnthropicStreamEvent.md)\&gt; |
| `ids` | [`IdMap`](/api/@rulvar/anthropic/classes/IdMap.md) |
| `emit` | (`event`) => `void` |
| `options?` | \{ `carryRetained?`: `Block`[]; \} |
| `options.carryRetained?` | `Block`[] |

## Returns

`Promise`\&lt;[`TurnMapping`](/api/@rulvar/anthropic/interfaces/TurnMapping.md)\&gt;
