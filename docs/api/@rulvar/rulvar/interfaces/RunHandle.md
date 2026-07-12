[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RunHandle

# Interface: RunHandle\&lt;R\&gt;

Defined in: `packages/core/dist/index.d.ts`

## Extended by

- [`ResumeHandle`](/api/@rulvar/rulvar/interfaces/ResumeHandle.md)
- [`TestRunHandle`](/api/@rulvar/testing/interfaces/TestRunHandle.md)

## Type Parameters

| Type Parameter |
| ------ |
| `R` |

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-events"></a> `events` | `AsyncIterable`\&lt;[`WorkflowEvent`](/api/@rulvar/rulvar/type-aliases/WorkflowEvent.md)\&gt; | `packages/core/dist/index.d.ts` |
| <a id="property-result"></a> `result` | `Promise`\&lt;[`RunOutcome`](/api/@rulvar/rulvar/type-aliases/RunOutcome.md)\&lt;`R`\&gt;\&gt; | `packages/core/dist/index.d.ts` |
| <a id="property-runid"></a> `runId` | `string` | `packages/core/dist/index.d.ts` |

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

***

### on()

```ts
on<T>(type, cb): () => void;
```

Defined in: `packages/core/dist/index.d.ts`

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* \| `"run:start"` \| `"run:end"` \| `"phase:start"` \| `"log"` \| `"budget:update"` \| `"external:waiting"` \| `"approval:pending"` \| `"child:start"` \| `"child:end"` \| `"agent:queued"` \| `"agent:start"` \| `"agent:end"` \| `"agent:error"` \| `"agent:schema-retry"` \| `"agent:stream"` \| `"tool:start"` \| `"tool:end"` \| `"plan:revised"` \| `"node:parked"` \| `"node:cancelled"` \| `"node:linked"` \| `"orchestrator:woke"` \| `"orchestrator:budget"` \| `"escalation:raised"` \| `"escalation:decided"` \| `"spawn:admitted"` \| `"spawn:rejected"` \| `"verify:failed"` \| `"ledger:op"` \| `"stall:detected"` \| `"guard:oscillation"` \| `"resolution:applied"` \| `"resolution:superseded"` \| `"termination:debit"` \| `"termination:denied"` \| `"termination:config-drift"` \| `"journal:compat"` |

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
