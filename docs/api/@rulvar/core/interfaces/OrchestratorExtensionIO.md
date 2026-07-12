[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OrchestratorExtensionIO

# Interface: OrchestratorExtensionIO

Defined in: [packages/core/src/orchestrator/extension.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L81)

The per-run IO the extension closes over (engine-owned effects).

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-admission"></a> `admission` | `readonly` | [`AdmissionController`](/api/@rulvar/core/classes/AdmissionController.md) | The single admission point for all spawns. | [packages/core/src/orchestrator/extension.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L112) |
| <a id="property-basescope"></a> `baseScope` | `readonly` | `string` | The scope the orchestrate call runs in ('' at the top level). | [packages/core/src/orchestrator/extension.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L84) |
| <a id="property-gates"></a> `gates` | `readonly` | `Record`\&lt;`string`, `unknown`\&gt; | The per-engine mechanical gate registry: named pure functions over AgentResult.artifacts. Typed loose at the seam exactly like `profiles`. | [packages/core/src/orchestrator/extension.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L94) |
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

Defined in: [packages/core/src/orchestrator/extension.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L131)

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

Defined in: [packages/core/src/orchestrator/extension.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L106)

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

Defined in: [packages/core/src/orchestrator/extension.ts:126](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L126)

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

Defined in: [packages/core/src/orchestrator/extension.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L118)

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
emit(event): void;
```

Defined in: [packages/core/src/orchestrator/extension.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L148)

Telemetry emission into the run event stream.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | \{ `type`: `string`; \} & `Record`\&lt;`string`, `unknown`\&gt; |

#### Returns

`void`

***

### flush()

```ts
flush(): Promise<void>;
```

Defined in: [packages/core/src/orchestrator/extension.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L110)

Flushes the serialized append queue before reading back.

#### Returns

`Promise`\&lt;`void`\&gt;

***

### mintId()

```ts
mintId(): string;
```

Defined in: [packages/core/src/orchestrator/extension.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L98)

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

Defined in: [packages/core/src/orchestrator/extension.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L146)

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

Defined in: [packages/core/src/orchestrator/extension.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L104)

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

Defined in: [packages/core/src/orchestrator/extension.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L144)

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

Defined in: [packages/core/src/orchestrator/extension.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L124)

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

Defined in: [packages/core/src/orchestrator/extension.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/extension.ts#L108)

The pinned journal view backing every pure fold.

#### Returns

readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[]
