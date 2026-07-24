[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResumeHandle

# Interface: ResumeHandle\&lt;R\&gt;

Defined in: [packages/core/src/engine/engine.ts:373](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L373)

## Extends

- [`RunHandle`](/api/@rulvar/core/interfaces/RunHandle.md)\&lt;`R`\&gt;

## Type Parameters

| Type Parameter |
| ------ |
| `R` |

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-events"></a> `events` | `AsyncIterable`\&lt;[`WorkflowEvent`](/api/@rulvar/core/type-aliases/WorkflowEvent.md)\&gt; | - | [`RunHandle`](/api/@rulvar/core/interfaces/RunHandle.md).[`events`](/api/@rulvar/core/interfaces/RunHandle.md#property-events) | [packages/core/src/engine/run-handle.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L81) |
| <a id="property-preview"></a> `preview` | `Promise`\&lt;[`ResumePreview`](/api/@rulvar/core/interfaces/ResumePreview.md)\&gt; | Resolves at settle with the replay accounting. | - | [packages/core/src/engine/engine.ts:375](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L375) |
| <a id="property-result"></a> `result` | `Promise`\&lt;[`RunOutcome`](/api/@rulvar/core/type-aliases/RunOutcome.md)\&lt;`R`\&gt;\&gt; | - | [`RunHandle`](/api/@rulvar/core/interfaces/RunHandle.md).[`result`](/api/@rulvar/core/interfaces/RunHandle.md#property-result) | [packages/core/src/engine/run-handle.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L80) |
| <a id="property-runid"></a> `runId` | `string` | - | [`RunHandle`](/api/@rulvar/core/interfaces/RunHandle.md).[`runId`](/api/@rulvar/core/interfaces/RunHandle.md#property-runid) | [packages/core/src/engine/run-handle.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L79) |

## Methods

### cancel()

```ts
cancel(reason?): Promise<void>;
```

Defined in: [packages/core/src/engine/run-handle.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L94)

Cooperative cancellation; the run settles 'cancelled' with a complete CostReport.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `reason?` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`RunHandle`](/api/@rulvar/core/interfaces/RunHandle.md).[`cancel`](/api/@rulvar/core/interfaces/RunHandle.md#cancel)

***

### on()

```ts
on<T>(type, cb): () => void;
```

Defined in: [packages/core/src/engine/run-handle.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L82)

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* \| `"run:start"` \| `"run:end"` \| `"phase:start"` \| `"log"` \| `"budget:update"` \| `"external:waiting"` \| `"approval:pending"` \| `"child:start"` \| `"child:end"` \| `"agent:queued"` \| `"agent:start"` \| `"agent:phase:start"` \| `"agent:phase:end"` \| `"agent:end"` \| `"agent:error"` \| `"agent:schema-retry"` \| `"agent:stream"` \| `"tool:start"` \| `"tool:end"` \| `"determinism:warning"` \| `"plan:revised"` \| `"node:parked"` \| `"node:cancelled"` \| `"node:linked"` \| `"orchestrator:woke"` \| `"orchestrator:budget"` \| `"escalation:raised"` \| `"escalation:decided"` \| `"spawn:admitted"` \| `"spawn:rejected"` \| `"verify:failed"` \| `"ledger:op"` \| `"stall:detected"` \| `"guard:oscillation"` \| `"resolution:applied"` \| `"resolution:superseded"` \| `"termination:debit"` \| `"termination:denied"` \| `"termination:config-drift"` \| `"journal:compat"` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `T` |
| `cb` | (`e`) => `void` |

#### Returns

() => `void`

#### Inherited from

[`RunHandle`](/api/@rulvar/core/interfaces/RunHandle.md).[`on`](/api/@rulvar/core/interfaces/RunHandle.md#on)

***

### resolveExternal()

```ts
resolveExternal(key, value): Promise<ResolutionOutcome>;
```

Defined in: [packages/core/src/engine/run-handle.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L92)

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

#### Inherited from

[`RunHandle`](/api/@rulvar/core/interfaces/RunHandle.md).[`resolveExternal`](/api/@rulvar/core/interfaces/RunHandle.md#resolveexternal)
