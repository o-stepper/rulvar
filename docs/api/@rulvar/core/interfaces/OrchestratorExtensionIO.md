[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OrchestratorExtensionIO

# Interface: OrchestratorExtensionIO

Defined in: [packages/core/src/orchestrator/extension.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L81)

The per-run IO the extension closes over (engine-owned effects).

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-admission"></a> `admission` | `readonly` | [`AdmissionController`](/api/@rulvar/core/classes/AdmissionController.md) | The single admission point for all spawns. | [packages/core/src/orchestrator/extension.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L122) |
| <a id="property-basescope"></a> `baseScope` | `readonly` | `string` | The scope the orchestrate call runs in ('' at the top level). | [packages/core/src/orchestrator/extension.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L84) |
| <a id="property-finalizereserveusd"></a> `finalizeReserveUsd?` | `readonly` | `number` | The finalize reserve carved out of the cap, resolved with it. | [packages/core/src/orchestrator/extension.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L106) |
| <a id="property-gates"></a> `gates` | `readonly` | `Record`\&lt;`string`, `unknown`\&gt; | The per-engine mechanical gate registry: named pure functions over AgentResult.artifacts. Typed loose at the seam exactly like `profiles`. | [packages/core/src/orchestrator/extension.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L94) |
| <a id="property-orchestratorcapusd"></a> `orchestratorCapUsd?` | `readonly` | `number` | The resolved orchestrator cap in absolute USD (DEF-7; XF-09): min(budget.capUsd, capFraction x B0) on a fresh run, the frozen orchestrator_budget_reserve dollars on resume. Resolved strictly before boot so an extension can freeze it into termination.init; always present under PlanRunner (an unresolvable cap refuses boot). | [packages/core/src/orchestrator/extension.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L104) |
| <a id="property-profiles"></a> `profiles` | `readonly` | `Record`\&lt;`string`, `unknown`\&gt; | Registered agent profiles advertised to this orchestrate call. | [packages/core/src/orchestrator/extension.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L88) |
| <a id="property-runceilingusd"></a> `runCeilingUsd?` | `readonly` | `number` | The run USD ceiling (B0), when one exists. | [packages/core/src/orchestrator/extension.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L96) |
| <a id="property-runid"></a> `runId` | `readonly` | `string` | - | [packages/core/src/orchestrator/extension.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L82) |

## Methods

### abandonBranch()

```ts
abandonBranch(attempt): Promise<{
  applied: boolean;
  seq: number;
}>;
```

Defined in: [packages/core/src/orchestrator/extension.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L141)

Appends the severing abandon ref-entry over a branch through the
ResolutionArbiter (DEF-4/DEF-5).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `attempt` | \{ `authorizedBy`: `number`; `logicalTaskId?`: `string`; `nodeId?`: `string`; `reason`: `string`; `retainCheckpoint?`: `boolean`; `retainWorktree?`: `boolean`; `target`: `number`; \} |
| `attempt.authorizedBy` | `number` |
| `attempt.logicalTaskId?` | `string` |
| `attempt.nodeId?` | `string` |
| `attempt.reason` | `string` |
| `attempt.retainCheckpoint?` | `boolean` |
| `attempt.retainWorktree?` | `boolean` |
| `attempt.target` | `number` |

#### Returns

`Promise`\<\{
  `applied`: `boolean`;
  `seq`: `number`;
\}\>

***

### append()

```ts
append(input): Promise<JournalEntry>;
```

Defined in: [packages/core/src/orchestrator/extension.ts:116](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L116)

Total-order append; the extension owns its scopes' content keys.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`ExtensionAppendInput`](/api/@rulvar/core/interfaces/ExtensionAppendInput.md) |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)\&gt;

***

### cancel()

```ts
cancel(handle, reason?): Promise<{
  cancelled: boolean;
  handle: number;
}>;
```

Defined in: [packages/core/src/orchestrator/extension.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L136)

Cancels an in-flight child by handle (AbortSignal).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `handle` | `number` |
| `reason?` | `string` |

#### Returns

`Promise`\<\{
  `cancelled`: `boolean`;
  `handle`: `number`;
\}\>

***

### dispatch()

```ts
dispatch(
   spec, 
   childScope, 
   identity): Promise<{
  handle: number;
}>;
```

Defined in: [packages/core/src/orchestrator/extension.ts:128](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L128)

Dispatches one child agent under the EXPLICIT child scope through
the ordinary ctx.agent path (semaphore, budget layers, forward
matching). Returns the journal-derived handle (the dispatch seq).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`ExtensionDispatchSpec`](/api/@rulvar/core/interfaces/ExtensionDispatchSpec.md) |
| `childScope` | `string` |
| `identity` | \{ `logicalTaskId`: `string`; `nodeId`: `string`; \} |
| `identity.logicalTaskId` | `string` |
| `identity.nodeId` | `string` |

#### Returns

`Promise`\<\{
  `handle`: `number`;
\}\>

***

### emit()

```ts
emit(event, options?): void;
```

Defined in: [packages/core/src/orchestrator/extension.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L158)

Telemetry emission into the run event stream.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `event` | \{ `type`: `string`; \} & `Record`\&lt;`string`, `unknown`\&gt; | - |
| `options?` | \{ `replayed?`: `boolean`; \} | - |
| `options.replayed?` | `boolean` | Marks the event as the replay of a journal-recovered decision (the standard envelope flag), so extension surfaces can emit recovered admissions honestly (v1.22.0 review P2-5). |

#### Returns

`void`

***

### flush()

```ts
flush(): Promise<void>;
```

Defined in: [packages/core/src/orchestrator/extension.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L120)

Flushes the serialized append queue before reading back.

#### Returns

`Promise`\&lt;`void`\&gt;

***

### mintId()

```ts
mintId(): string;
```

Defined in: [packages/core/src/orchestrator/extension.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L108)

ULID minting for engine-owned identifiers (NodeIds).

#### Returns

`string`

***

### orchestratorScope()

```ts
orchestratorScope(): string;
```

Defined in: [packages/core/src/orchestrator/extension.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L86)

The orchestrator's child scope (agent:&lt;seq&gt;); throws before the loop starts.

#### Returns

`string`

***

### priceUsd()

```ts
priceUsd(servedBy, usage): number | undefined;
```

Defined in: [packages/core/src/orchestrator/extension.ts:156](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L156)

The engine price fold (journal facts in, USD out).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `servedBy` | `string` \| `undefined` |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) |

#### Returns

`number` \| `undefined`

***

### random()

```ts
random(key?): Promise<number>;
```

Defined in: [packages/core/src/orchestrator/extension.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L114)

A journaled random draw in [0, 1) under the orchestrate scope: the
ctx.random primitive, computed once live and replayed by match. The
spot-check gate draws HERE, never Math.random.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key?` | `string` |

#### Returns

`Promise`\&lt;`number`\&gt;

***

### registerAlias()

```ts
registerAlias(donorScope, targetScope): void;
```

Defined in: [packages/core/src/orchestrator/extension.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L154)

Registers a node.link scope-prefix alias for forward matching
(DEF-5). Idempotent; rebuilt by fold on resume.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `donorScope` | `string` |
| `targetScope` | `string` |

#### Returns

`void`

***

### settledOf()

```ts
settledOf(handle): 
  | AgentResult<unknown>
  | undefined;
```

Defined in: [packages/core/src/orchestrator/extension.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L134)

The settled result of a dispatched child, when it settled.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `handle` | `number` |

#### Returns

  \| [`AgentResult`](/api/@rulvar/core/interfaces/AgentResult.md)\&lt;`unknown`\&gt;
  \| `undefined`

***

### snapshot()

```ts
snapshot(): readonly JournalEntry[];
```

Defined in: [packages/core/src/orchestrator/extension.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L118)

The pinned journal view backing every pure fold.

#### Returns

readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[]

***

### terminate()?

```ts
optional terminate(error): void;
```

Defined in: [packages/core/src/orchestrator/extension.ts:180](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L180)

A deterministic run failure declared by the extension (v1.35.0 review P2-1):
the first call stores the error and aborts the orchestrator loop;
the orchestrate settle boundary rethrows it, so the run fails with
the given typed error instead of asking the model to finish. Later
calls do nothing. The intended producer is a journaled
policy verdict (the PlanRunner guards fallback 'fail-run'): boot
terminates again from the journal on resume, so the failure rolls
forward without another decision or model call. Optional so
IO implementations built before v1.36 keep compiling.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `error` | `Error` |

#### Returns

`void`
