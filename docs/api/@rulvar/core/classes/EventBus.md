[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EventBus

# Class: EventBus

Defined in: [packages/core/src/engine/events.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/events.ts#L46)

The per-run event bus. seq is strictly increasing in emission order;
`iterate()` yields events from subscription onward; `on()` is the
callback form over the same stream and the same seq values.

## Constructors

### Constructor

```ts
new EventBus(options): EventBus;
```

Defined in: [packages/core/src/engine/events.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/events.ts#L56)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `maskEvents?`: `boolean`; `now?`: () => `number`; `runId`: `string`; `spans`: [`SpanRegistry`](/api/@rulvar/core/classes/SpanRegistry.md); \} | - |
| `options.maskEvents?` | `boolean` | Default true (M8-T04; docs/09, section "Redaction and sensitive data"): key-shaped strings in every emitted body are masked. Telemetry only, never the journal: events are excluded from identity by construction, so masking cannot perturb replay. |
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

Defined in: [packages/core/src/engine/events.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/events.ts#L74)

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

Defined in: [packages/core/src/engine/events.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/events.ts#L111)

Ends every open iterator once the run has settled.

#### Returns

`void`

***

### iterate()

```ts
iterate(): AsyncIterable<WorkflowEvent>;
```

Defined in: [packages/core/src/engine/events.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/events.ts#L119)

#### Returns

`AsyncIterable`\&lt;[`WorkflowEvent`](/api/@rulvar/core/type-aliases/WorkflowEvent.md)\&gt;

***

### on()

```ts
on<T>(type, cb): () => void;
```

Defined in: [packages/core/src/engine/events.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/events.ts#L95)

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* \| `"agent:start"` \| `"agent:error"` \| `"log"` \| `"agent:schema-retry"` \| `"tool:end"` \| `"tool:start"` \| `"agent:stream"` \| `"budget:update"` \| `"run:start"` \| `"run:end"` \| `"phase:start"` \| `"external:waiting"` \| `"approval:pending"` \| `"child:start"` \| `"child:end"` \| `"agent:queued"` \| `"agent:end"` \| `"plan:revised"` \| `"node:parked"` \| `"node:cancelled"` \| `"node:linked"` \| `"orchestrator:woke"` \| `"orchestrator:budget"` \| `"escalation:raised"` \| `"escalation:decided"` \| `"spawn:admitted"` \| `"spawn:rejected"` \| `"verify:failed"` \| `"ledger:op"` \| `"stall:detected"` \| `"guard:oscillation"` \| `"resolution:applied"` \| `"resolution:superseded"` \| `"termination:debit"` \| `"termination:denied"` \| `"termination:config-drift"` \| `"journal:compat"` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `T` |
| `cb` | (`event`) => `void` |

#### Returns

() => `void`
