[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunHandle

# Interface: RunHandle\&lt;R\&gt;

Defined in: [packages/core/src/engine/run-handle.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L60)

## Extended by

- [`ResumeHandle`](/api/@rulvar/core/interfaces/ResumeHandle.md)

## Type Parameters

| Type Parameter |
| ------ |
| `R` |

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-events"></a> `events` | `AsyncIterable`\&lt;[`WorkflowEvent`](/api/@rulvar/core/type-aliases/WorkflowEvent.md)\&gt; | [packages/core/src/engine/run-handle.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L63) |
| <a id="property-result"></a> `result` | `Promise`\&lt;[`RunOutcome`](/api/@rulvar/core/type-aliases/RunOutcome.md)\&lt;`R`\&gt;\&gt; | [packages/core/src/engine/run-handle.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L62) |
| <a id="property-runid"></a> `runId` | `string` | [packages/core/src/engine/run-handle.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L61) |

## Methods

### cancel()

```ts
cancel(reason?): Promise<void>;
```

Defined in: [packages/core/src/engine/run-handle.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L76)

Cooperative cancellation; the run settles 'cancelled' with a complete CostReport.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `reason?` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

***

### on()

```ts
on<T>(type, cb): () => void;
```

Defined in: [packages/core/src/engine/run-handle.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L64)

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* \| `"agent:start"` \| `"agent:error"` \| `"log"` \| `"agent:schema-retry"` \| `"tool:end"` \| `"tool:start"` \| `"agent:stream"` \| `"budget:update"` \| `"run:start"` \| `"run:end"` \| `"phase:start"` \| `"external:waiting"` \| `"approval:pending"` \| `"child:start"` \| `"child:end"` \| `"agent:queued"` \| `"agent:end"` \| `"plan:revised"` \| `"node:parked"` \| `"node:cancelled"` \| `"node:linked"` \| `"orchestrator:woke"` \| `"orchestrator:budget"` \| `"escalation:raised"` \| `"escalation:decided"` \| `"spawn:admitted"` \| `"spawn:rejected"` \| `"verify:failed"` \| `"ledger:op"` \| `"stall:detected"` \| `"guard:oscillation"` \| `"resolution:applied"` \| `"resolution:superseded"` \| `"termination:debit"` \| `"termination:denied"` \| `"termination:config-drift"` \| `"journal:compat"` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `T` |
| `cb` | (`e`) => `void` |

#### Returns

() => `void`

***

### resolveExternal()

```ts
resolveExternal(key, value): Promise<ResolutionOutcome>;
```

Defined in: [packages/core/src/engine/run-handle.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L74)

Resolves an open awaitExternal suspension (DEF-4 signature): applied
when this attempt wins the first-closing-wins fold; repeated
resolution is defined behavior, not an error. An invalid live payload
throws InvalidResolutionError and journals nothing.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |
| `value` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) |

#### Returns

`Promise`\&lt;[`ResolutionOutcome`](/api/@rulvar/core/type-aliases/ResolutionOutcome.md)\&gt;
