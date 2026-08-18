[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunHandle

# Interface: RunHandle\&lt;R\&gt;

Defined in: [packages/core/src/engine/run-handle.ts:436](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L436)

## Extended by

- [`ResumeHandle`](/api/@rulvar/core/interfaces/ResumeHandle.md)

## Type Parameters

| Type Parameter |
| ------ |
| `R` |

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-events"></a> `events` | `AsyncIterable`\&lt;[`WorkflowEvent`](/api/@rulvar/core/type-aliases/WorkflowEvent.md)\&gt; | [packages/core/src/engine/run-handle.ts:439](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L439) |
| <a id="property-result"></a> `result` | `Promise`\&lt;[`RunOutcome`](/api/@rulvar/core/type-aliases/RunOutcome.md)\&lt;`R`\&gt;\&gt; | [packages/core/src/engine/run-handle.ts:438](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L438) |
| <a id="property-runid"></a> `runId` | `string` | [packages/core/src/engine/run-handle.ts:437](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L437) |

## Methods

### cancel()

```ts
cancel(reason?): Promise<void>;
```

Defined in: [packages/core/src/engine/run-handle.ts:463](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L463)

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

Defined in: [packages/core/src/engine/run-handle.ts:440](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L440)

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

***

### resolveExternal()

```ts
resolveExternal(key, value): Promise<ResolutionOutcome>;
```

Defined in: [packages/core/src/engine/run-handle.ts:450](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L450)

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

***

### revokeApproval()

```ts
revokeApproval(key, options): Promise<ApprovalRevocationOutcome>;
```

Defined in: [packages/core/src/engine/run-handle.ts:458](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L458)

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
