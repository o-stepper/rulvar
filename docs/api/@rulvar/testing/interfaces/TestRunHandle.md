[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / TestRunHandle

# Interface: TestRunHandle\&lt;R\&gt;

Defined in: [packages/testing/src/test-engine.ts:22](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/test-engine.ts#L22)

A RunHandle that records its own event stream for the matchers.

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
| <a id="property-eventsseen"></a> `eventsSeen` | [`WorkflowEvent`](/api/@rulvar/rulvar/type-aliases/WorkflowEvent.md)[] | Every event emitted by the run, in seq order. | - | [packages/testing/src/test-engine.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/test-engine.ts#L24) |
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
| `T` *extends* \| `"run:start"` \| `"run:end"` \| `"phase:start"` \| `"log"` \| `"budget:update"` \| `"external:waiting"` \| `"approval:pending"` \| `"child:start"` \| `"child:end"` \| `"agent:queued"` \| `"agent:start"` \| `"agent:phase:start"` \| `"agent:phase:end"` \| `"agent:end"` \| `"agent:error"` \| `"quota:denied"` \| `"budget:exposure-wait"` \| `"agent:schema-retry"` \| `"control:wire"` \| `"agent:stream"` \| `"tool:start"` \| `"tool:end"` \| `"determinism:warning"` \| `"plan:revised"` \| `"node:parked"` \| `"node:cancelled"` \| `"node:linked"` \| `"orchestrator:woke"` \| `"orchestrator:budget"` \| `"orchestrator:acceptance"` \| `"escalation:raised"` \| `"escalation:decided"` \| `"spawn:admitted"` \| `"spawn:rejected"` \| `"admission:lease-lost"` \| `"verify:failed"` \| `"ledger:op"` \| `"stall:detected"` \| `"guard:oscillation"` \| `"resolution:applied"` \| `"resolution:superseded"` \| `"termination:debit"` \| `"termination:denied"` \| `"termination:config-drift"` \| `"journal:compat"` |

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

***

### revokeApproval()

```ts
revokeApproval(key, options): Promise<ApprovalRevocationOutcome>;
```

Defined in: `packages/core/dist/index.d.ts`

Revokes a tool approval (RV4008): a still-open approval is denied
through the ordinary arbitration, and a RECORDED allow gains a
journaled `approval_revoked` decision that beats it at the
consumption recheck, so an allow granted, crashed over, and
revoked never dispatches its tool on resume.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |
| `options` | \{ `principal`: `string`; `reason`: `string`; \} |
| `options.principal` | `string` |
| `options.reason` | `string` |

#### Returns

`Promise`\&lt;[`ApprovalRevocationOutcome`](/api/@rulvar/rulvar/interfaces/ApprovalRevocationOutcome.md)\&gt;

#### Inherited from

[`RunHandle`](/api/@rulvar/rulvar/interfaces/RunHandle.md).[`revokeApproval`](/api/@rulvar/rulvar/interfaces/RunHandle.md#revokeapproval)
