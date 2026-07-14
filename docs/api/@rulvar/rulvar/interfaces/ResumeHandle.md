[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ResumeHandle

# Interface: ResumeHandle\&lt;R\&gt;

Defined in: `packages/core/dist/index.d.ts`

## Extends

- [`RunHandle`](/api/@rulvar/rulvar/interfaces/RunHandle.md)\&lt;`R`\&gt;

## Type Parameters

| Type Parameter |
| ------ |
| `R` |

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-events"></a> `events` | `AsyncIterable`\&lt;[`WorkflowEvent`](/api/@rulvar/rulvar/type-aliases/WorkflowEvent.md)\&gt; | - | [`RunHandle`](/api/@rulvar/rulvar/interfaces/RunHandle.md).[`events`](/api/@rulvar/rulvar/interfaces/RunHandle.md#property-events) | `packages/core/dist/index.d.ts` |
| <a id="property-preview"></a> `preview` | `Promise`\&lt;[`ResumePreview`](/api/@rulvar/rulvar/interfaces/ResumePreview.md)\&gt; | Resolves at settle with the replay accounting. | - | `packages/core/dist/index.d.ts` |
| <a id="property-result"></a> `result` | `Promise`\&lt;[`RunOutcome`](/api/@rulvar/rulvar/type-aliases/RunOutcome.md)\&lt;`R`\&gt;\&gt; | - | [`RunHandle`](/api/@rulvar/rulvar/interfaces/RunHandle.md).[`result`](/api/@rulvar/rulvar/interfaces/RunHandle.md#property-result) | `packages/core/dist/index.d.ts` |
| <a id="property-runid"></a> `runId` | `string` | - | [`RunHandle`](/api/@rulvar/rulvar/interfaces/RunHandle.md).[`runId`](/api/@rulvar/rulvar/interfaces/RunHandle.md#property-runid) | `packages/core/dist/index.d.ts` |

## Methods

### cancel()

```ts
cancel(reason?): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

Cooperative cancellation; the run settles 'cancelled' with a complete CostReport.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `reason?` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`RunHandle`](/api/@rulvar/rulvar/interfaces/RunHandle.md).[`cancel`](/api/@rulvar/rulvar/interfaces/RunHandle.md#cancel)

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
| `cb` | (`e`) => `void` |

#### Returns

() => `void`

#### Inherited from

[`RunHandle`](/api/@rulvar/rulvar/interfaces/RunHandle.md).[`on`](/api/@rulvar/rulvar/interfaces/RunHandle.md#on)

***

### resolveExternal()

```ts
resolveExternal(key, value): Promise<ResolutionOutcome>;
```

Defined in: `packages/core/dist/index.d.ts`

Resolves an open awaitExternal suspension (DEF-4 signature): applied
when this attempt wins the first-closing-wins fold; repeated
resolution is defined behavior, not an error. An invalid live payload
throws InvalidResolutionError and journals nothing.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |
| `value` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) |

#### Returns

`Promise`\&lt;[`ResolutionOutcome`](/api/@rulvar/rulvar/type-aliases/ResolutionOutcome.md)\&gt;

#### Inherited from

[`RunHandle`](/api/@rulvar/rulvar/interfaces/RunHandle.md).[`resolveExternal`](/api/@rulvar/rulvar/interfaces/RunHandle.md#resolveexternal)
