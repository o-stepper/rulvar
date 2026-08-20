[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResumeHandle

# Interface: ResumeHandle\&lt;R\&gt;

Defined in: [packages/core/src/engine/engine.ts:695](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L695)

## Extends

- [`RunHandle`](/api/@rulvar/core/interfaces/RunHandle.md)\&lt;`R`\&gt;

## Type Parameters

| Type Parameter |
| ------ |
| `R` |

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-events"></a> `events` | `AsyncIterable`\&lt;[`WorkflowEvent`](/api/@rulvar/core/type-aliases/WorkflowEvent.md)\&gt; | - | [`RunHandle`](/api/@rulvar/core/interfaces/RunHandle.md).[`events`](/api/@rulvar/core/interfaces/RunHandle.md#property-events) | [packages/core/src/engine/run-handle.ts:471](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L471) |
| <a id="property-preview"></a> `preview` | `Promise`\&lt;[`ResumePreview`](/api/@rulvar/core/interfaces/ResumePreview.md)\&gt; | Resolves at settle with the replay accounting. | - | [packages/core/src/engine/engine.ts:697](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L697) |
| <a id="property-result"></a> `result` | `Promise`\&lt;[`RunOutcome`](/api/@rulvar/core/type-aliases/RunOutcome.md)\&lt;`R`\&gt;\&gt; | - | [`RunHandle`](/api/@rulvar/core/interfaces/RunHandle.md).[`result`](/api/@rulvar/core/interfaces/RunHandle.md#property-result) | [packages/core/src/engine/run-handle.ts:470](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L470) |
| <a id="property-runid"></a> `runId` | `string` | - | [`RunHandle`](/api/@rulvar/core/interfaces/RunHandle.md).[`runId`](/api/@rulvar/core/interfaces/RunHandle.md#property-runid) | [packages/core/src/engine/run-handle.ts:469](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L469) |

## Methods

### cancel()

```ts
cancel(reason?): Promise<void>;
```

Defined in: [packages/core/src/engine/run-handle.ts:495](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L495)

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

Defined in: [packages/core/src/engine/run-handle.ts:472](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L472)

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* \| `"run:start"` \| `"run:end"` \| `"phase:start"` \| `"log"` \| `"budget:update"` \| `"external:waiting"` \| `"approval:pending"` \| `"child:start"` \| `"child:end"` \| `"agent:queued"` \| `"agent:start"` \| `"agent:phase:start"` \| `"agent:phase:end"` \| `"agent:end"` \| `"agent:error"` \| `"quota:denied"` \| `"budget:exposure-wait"` \| `"agent:schema-retry"` \| `"control:wire"` \| `"agent:stream"` \| `"tool:start"` \| `"tool:end"` \| `"determinism:warning"` \| `"plan:revised"` \| `"node:parked"` \| `"node:cancelled"` \| `"node:linked"` \| `"orchestrator:woke"` \| `"orchestrator:budget"` \| `"orchestrator:acceptance"` \| `"escalation:raised"` \| `"escalation:decided"` \| `"spawn:admitted"` \| `"spawn:rejected"` \| `"verify:failed"` \| `"ledger:op"` \| `"stall:detected"` \| `"guard:oscillation"` \| `"resolution:applied"` \| `"resolution:superseded"` \| `"termination:debit"` \| `"termination:denied"` \| `"termination:config-drift"` \| `"journal:compat"` |

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

Defined in: [packages/core/src/engine/run-handle.ts:482](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L482)

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

***

### revokeApproval()

```ts
revokeApproval(key, options): Promise<ApprovalRevocationOutcome>;
```

Defined in: [packages/core/src/engine/run-handle.ts:490](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L490)

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

`Promise`\&lt;[`ApprovalRevocationOutcome`](/api/@rulvar/core/interfaces/ApprovalRevocationOutcome.md)\&gt;

#### Inherited from

[`RunHandle`](/api/@rulvar/core/interfaces/RunHandle.md).[`revokeApproval`](/api/@rulvar/core/interfaces/RunHandle.md#revokeapproval)
