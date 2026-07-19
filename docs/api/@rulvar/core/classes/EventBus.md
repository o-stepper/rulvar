[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EventBus

# Class: EventBus

Defined in: [packages/core/src/engine/events.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/events.ts#L67)

The per-run event bus. seq is strictly increasing in emission order;
`iterate()` yields events from subscription onward; `on()` is the
callback form over the same stream and the same seq values.

## Constructors

### Constructor

```ts
new EventBus(options): EventBus;
```

Defined in: [packages/core/src/engine/events.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/events.ts#L78)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `firstSeq?`: `number`; `maskEvents?`: `boolean`; `now?`: () => `number`; `runId`: `string`; `spans`: [`SpanRegistry`](/api/@rulvar/core/classes/SpanRegistry.md); \} | - |
| `options.firstSeq?` | `number` | First seq value (default 0): the resumed-segment base that keeps seq strictly increasing per run across segments (v1.22.0 review P1-2). |
| `options.maskEvents?` | `boolean` | Default true (M8-T04): key-shaped strings in every emitted body are masked. Telemetry only, never the journal: events are excluded from identity by construction, so masking cannot perturb replay. |
| `options.now?` | () => `number` | - |
| `options.runId` | `string` | - |
| `options.spans` | [`SpanRegistry`](/api/@rulvar/core/classes/SpanRegistry.md) | - |

#### Returns

`EventBus`

## Methods

### emit()

```ts
emit(
   body, 
   spanId, 
   replayed?): WorkflowEvent;
```

Defined in: [packages/core/src/engine/events.ts:105](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/events.ts#L105)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `body` | [`WorkflowEventBody`](/api/@rulvar/core/type-aliases/WorkflowEventBody.md) |
| `spanId` | `string` |
| `replayed?` | `boolean` |

#### Returns

[`WorkflowEvent`](/api/@rulvar/core/type-aliases/WorkflowEvent.md)

***

### end()

```ts
end(): void;
```

Defined in: [packages/core/src/engine/events.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/events.ts#L190)

Ends every open iterator once the run has settled.

#### Returns

`void`

***

### iterate()

```ts
iterate(): AsyncIterable<WorkflowEvent>;
```

Defined in: [packages/core/src/engine/events.ts:198](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/events.ts#L198)

#### Returns

`AsyncIterable`\&lt;[`WorkflowEvent`](/api/@rulvar/core/type-aliases/WorkflowEvent.md)\&gt;

***

### on()

```ts
on<T>(type, cb): () => void;
```

Defined in: [packages/core/src/engine/events.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/events.ts#L174)

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* \| `"run:start"` \| `"run:end"` \| `"phase:start"` \| `"log"` \| `"budget:update"` \| `"external:waiting"` \| `"approval:pending"` \| `"child:start"` \| `"child:end"` \| `"agent:queued"` \| `"agent:start"` \| `"agent:end"` \| `"agent:error"` \| `"agent:schema-retry"` \| `"agent:stream"` \| `"tool:start"` \| `"tool:end"` \| `"plan:revised"` \| `"node:parked"` \| `"node:cancelled"` \| `"node:linked"` \| `"orchestrator:woke"` \| `"orchestrator:budget"` \| `"escalation:raised"` \| `"escalation:decided"` \| `"spawn:admitted"` \| `"spawn:rejected"` \| `"verify:failed"` \| `"ledger:op"` \| `"stall:detected"` \| `"guard:oscillation"` \| `"resolution:applied"` \| `"resolution:superseded"` \| `"termination:debit"` \| `"termination:denied"` \| `"termination:config-drift"` \| `"journal:compat"` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `T` |
| `cb` | (`event`) => `void` |

#### Returns

() => `void`
