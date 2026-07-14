[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / OrchestratorExtensionIO

# Interface: OrchestratorExtensionIO

Defined in: `packages/core/dist/index.d.ts`

The per-run IO the extension closes over (engine-owned effects).

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-admission"></a> `admission` | `readonly` | [`AdmissionController`](/api/@rulvar/rulvar/classes/AdmissionController.md) | The single admission point for all spawns. | `packages/core/dist/index.d.ts` |
| <a id="property-basescope"></a> `baseScope` | `readonly` | `string` | The scope the orchestrate call runs in ('' at the top level). | `packages/core/dist/index.d.ts` |
| <a id="property-gates"></a> `gates` | `readonly` | `Record`\&lt;`string`, `unknown`\&gt; | The per-engine mechanical gate registry: named pure functions over AgentResult.artifacts. Typed loose at the seam exactly like `profiles`. | `packages/core/dist/index.d.ts` |
| <a id="property-profiles"></a> `profiles` | `readonly` | `Record`\&lt;`string`, `unknown`\&gt; | Registered agent profiles advertised to this orchestrate call. | `packages/core/dist/index.d.ts` |
| <a id="property-runceilingusd"></a> `runCeilingUsd?` | `readonly` | `number` | The run USD ceiling (B0), when one exists. | `packages/core/dist/index.d.ts` |
| <a id="property-runid"></a> `runId` | `readonly` | `string` | - | `packages/core/dist/index.d.ts` |

## Methods

### abandonBranch()

```ts
abandonBranch(attempt): Promise<{
  applied: boolean;
  seq: number;
}>;
```

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

Total-order append; the extension owns its scopes' content keys.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`ExtensionAppendInput`](/api/@rulvar/rulvar/interfaces/ExtensionAppendInput.md) |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)\&gt;

***

### cancel()

```ts
cancel(handle, reason?): Promise<{
  cancelled: boolean;
  handle: number;
}>;
```

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

Dispatches one child agent under the EXPLICIT child scope through
the ordinary ctx.agent path (semaphore, budget layers, forward
matching). Returns the journal-derived handle (the dispatch seq).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`ExtensionDispatchSpec`](/api/@rulvar/rulvar/interfaces/ExtensionDispatchSpec.md) |
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

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

Flushes the serialized append queue before reading back.

#### Returns

`Promise`\&lt;`void`\&gt;

***

### mintId()

```ts
mintId(): string;
```

Defined in: `packages/core/dist/index.d.ts`

ULID minting for engine-owned identifiers (NodeIds).

#### Returns

`string`

***

### orchestratorScope()

```ts
orchestratorScope(): string;
```

Defined in: `packages/core/dist/index.d.ts`

The orchestrator's child scope (agent:&lt;seq&gt;); throws before the loop starts.

#### Returns

`string`

***

### priceUsd()

```ts
priceUsd(servedBy, usage): number | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

The engine price fold (journal facts in, USD out).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `servedBy` | `string` \| `undefined` |
| `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) |

#### Returns

`number` \| `undefined`

***

### random()

```ts
random(key?): Promise<number>;
```

Defined in: `packages/core/dist/index.d.ts`

A journaled random draw in `0, 1) under the orchestrate scope: the
ctx.random primitive, computed once live and replayed by match. The
spot-check gate draws HERE, never Math.random.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| key? | string |

#### Returns

Promise\&lt;number\&gt;

***

### registerAlias()

ts
registerAlias(donorScope, targetScope): void;


Defined in: [packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

The settled result of a dispatched child, when it settled.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `handle` | `number` |

#### Returns

  \| [`AgentResult`](/api/@rulvar/rulvar/interfaces/AgentResult.md)\&lt;`unknown`\&gt;
  \| `undefined`

***

### snapshot()

```ts
snapshot(): readonly JournalEntry[];
```

Defined in: `packages/core/dist/index.d.ts`

The pinned journal view backing every pure fold.

#### Returns

readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]
