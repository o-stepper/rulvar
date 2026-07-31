[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / StreamHooks

# Interface: StreamHooks

Defined in: `packages/core/dist/index.d.ts`

Live-only hooks the engine passes to a stream dispatch (RV1013).
Never journaled, never part of request identity: like transport
retries, they exist only on the live wire path.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-oncontinuationsegment"></a> `onContinuationSegment?` | (`info`) => `Promise`\&lt; \| [`WireError`](/api/@rulvar/rulvar/type-aliases/WireError.md) \| `undefined`\&gt; | Called BEFORE each provider-side continuation wire beyond the first (a `pause_turn` absorption makes several wire requests inside one dispatch): under the engine's opt-in hard mode (`quota.reserveContinuations`) the engine reserves the segment in the configured limiter before its egress. A resolved `undefined` admits the wire; a resolved WireError DENIES it, and the adapter must yield exactly that error as its terminal event and stop, so the wire never leaves. `segment` is the ordinal of the wire about to be sent (2 for the first continuation). A multi-wire adapter that never calls the hook keeps the documented post-hoc settlement semantics. | `packages/core/dist/index.d.ts` |
