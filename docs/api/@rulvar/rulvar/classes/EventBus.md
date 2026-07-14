[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EventBus

# Class: EventBus

Defined in: `packages/core/dist/index.d.ts`

The per-run event bus. seq is strictly increasing in emission order;
`iterate()` yields events from subscription onward; `on()` is the
callback form over the same stream and the same seq values.

## Constructors

### Constructor

```ts
new EventBus(options): EventBus;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `maskEvents?`: `boolean`; `now?`: () => `number`; `runId`: `string`; `spans`: [`SpanRegistry`](/api/@rulvar/rulvar/classes/SpanRegistry.md); \} | - |
| `options.maskEvents?` | `boolean` | Default true (M8-T04): key-shaped strings in every emitted body are masked. Telemetry only, never the journal: events are excluded from identity by construction, so masking cannot perturb replay. |
| `options.now?` | () => `number` | - |
| `options.runId` | `string` | - |
| `options.spans` | [`SpanRegistry`](/api/@rulvar/rulvar/classes/SpanRegistry.md) | - |

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

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `body` | [`WorkflowEventBody`](/api/@rulvar/rulvar/type-aliases/WorkflowEventBody.md) |
| `spanId` | `string` |
| `replayed?` | `boolean` |

#### Returns

[`WorkflowEvent`](/api/@rulvar/rulvar/type-aliases/WorkflowEvent.md)

***

### end()

```ts
end(): void;
```

Defined in: `packages/core/dist/index.d.ts`

Ends every open iterator once the run has settled.

#### Returns

`void`

***

### iterate()

```ts
iterate(): AsyncIterable<WorkflowEvent>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Returns

`AsyncIterable`\&lt;[`WorkflowEvent`](/api/@rulvar/rulvar/type-aliases/WorkflowEvent.md)\&gt;

***

### on()

```ts
on<T>(type, cb): () => void;
```

Defined in: `packages/core/dist/index.d.ts`

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* \| `"plan:revised"` \| `"node:parked"` \| `"node:cancelled"` \| `"node:linked"` \| `"orchestrator:woke"` \| `"orchestrator:budget"` \| `"escalation:raised"` \| `"escalation:decided"` \| `"spawn:admitted"` \| `"spawn:rejected"` \| `"verify:failed"` \| `"ledger:op"` \| `"stall:detected"` \| `"guard:oscillation"` \| `"resolution:applied"` \| `"resolution:superseded"` \| `"termination:debit"` \| `"termination:denied"` \| `"termination:config-drift"` \| `"journal:compat"` \| `"agent:queued"` \| `"agent:start"` \| `"agent:end"` \| `"agent:error"` \| `"agent:schema-retry"` \| `"agent:stream"` \| `"run:start"` \| `"run:end"` \| `"phase:start"` \| `"log"` \| `"budget:update"` \| `"external:waiting"` \| `"approval:pending"` \| `"child:start"` \| `"child:end"` \| `"tool:start"` \| `"tool:end"` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `T` |
| `cb` | (`event`) => `void` |

#### Returns

() => `void`
