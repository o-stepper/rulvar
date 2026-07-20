[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/anthropic](/api/@rulvar/anthropic/index.md) / mapAnthropicStream

# Function: mapAnthropicStream()

```ts
function mapAnthropicStream(
   stream, 
   ids, 
options?): AsyncGenerator<ChatEvent, TurnMapping>;
```

Defined in: [packages/anthropic/src/wire.ts:431](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/wire.ts#L431)

Maps one Messages API stream into ChatEvents, yielding each canonical
event AS the corresponding provider event is consumed: the consumer's
pull drives the provider read (natural backpressure, no buffering, no
detached work). The generator's RETURN value carries the accumulated
turn state the adapter needs for pause_turn continuation. Yields an
early usage event from message_start (the input side is known
immediately) and exactly one terminal finish unless the turn paused
(pause_turn) or errored. `carryRetained` holds thinking blocks from
earlier pause_turn continuations of the same turn so the terminal
finish ships the whole turn's retention payload (M4-T02).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `stream` | `AsyncIterable`\&lt;[`AnthropicStreamEvent`](/api/@rulvar/anthropic/type-aliases/AnthropicStreamEvent.md)\&gt; |
| `ids` | [`IdMap`](/api/@rulvar/anthropic/classes/IdMap.md) |
| `options?` | \{ `carryRetained?`: [`Block`](/api/@rulvar/anthropic/type-aliases/Block.md)[]; \} |
| `options.carryRetained?` | [`Block`](/api/@rulvar/anthropic/type-aliases/Block.md)[] |

## Returns

`AsyncGenerator`\&lt;[`ChatEvent`](/api/@rulvar/rulvar/type-aliases/ChatEvent.md), [`TurnMapping`](/api/@rulvar/anthropic/interfaces/TurnMapping.md)\&gt;
