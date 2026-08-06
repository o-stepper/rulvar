[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OrchestratorRuntime

# Interface: OrchestratorRuntime

Defined in: [packages/core/src/orchestrator/handles.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L158)

The engine seam the spawn tools close over (never on ToolContext).

## Methods

### awaitAll()

```ts
awaitAll(handles): Promise<TaskDigest[]>;
```

Defined in: [packages/core/src/orchestrator/handles.ts:180](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L180)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `handles` | `number`[] |

#### Returns

`Promise`\&lt;[`TaskDigest`](/api/@rulvar/core/interfaces/TaskDigest.md)[]\&gt;

***

### awaitAny()

```ts
awaitAny(handles): Promise<TaskDigest>;
```

Defined in: [packages/core/src/orchestrator/handles.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L179)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `handles` | `number`[] |

#### Returns

`Promise`\&lt;[`TaskDigest`](/api/@rulvar/core/interfaces/TaskDigest.md)\&gt;

***

### cancel()

```ts
cancel(handle, reason?): Promise<{
  cancelled: boolean;
  handle: number;
}>;
```

Defined in: [packages/core/src/orchestrator/handles.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L181)

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

### getChildResult()

```ts
getChildResult(handle, opts?): Promise<ChildResultPage>;
```

Defined in: [packages/core/src/orchestrator/handles.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L185)

A page of a settled child's full output; opt-in `get_child_result` (RV-201).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `handle` | `number` |
| `opts?` | \{ `maxChars?`: `number`; `offset?`: `number`; \} |
| `opts.maxChars?` | `number` |
| `opts.offset?` | `number` |

#### Returns

`Promise`\&lt;[`ChildResultPage`](/api/@rulvar/core/interfaces/ChildResultPage.md)\&gt;

***

### getSettledChildResults()

```ts
getSettledChildResults(handles, opts?): Promise<ChildResultPage[]>;
```

Defined in: [packages/core/src/orchestrator/handles.ts:202](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L202)

First pages of SEVERAL settled children in one call; opt-in
`get_settled_child_results` (RV1807). Refuses typed BEFORE any
read when any named handle is unknown or still running, so
consuming the exact `settledHandles` set of an `await_any` digest
never probes by error.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `handles` | `number`[] |
| `opts?` | \{ `maxCharsPerChild?`: `number`; \} |
| `opts.maxCharsPerChild?` | `number` |

#### Returns

`Promise`\&lt;[`ChildResultPage`](/api/@rulvar/core/interfaces/ChildResultPage.md)[]\&gt;

***

### readChildArtifact()

```ts
readChildArtifact(
   handle, 
   artifactId, 
opts?): Promise<ChildArtifactPage>;
```

Defined in: [packages/core/src/orchestrator/handles.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L190)

A page of a settled child's artifact content; opt-in `read_child_artifact` (RV-201).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `handle` | `number` |
| `artifactId` | `string` |
| `opts?` | \{ `maxChars?`: `number`; `offset?`: `number`; \} |
| `opts.maxChars?` | `number` |
| `opts.offset?` | `number` |

#### Returns

`Promise`\&lt;[`ChildArtifactPage`](/api/@rulvar/core/interfaces/ChildArtifactPage.md)\&gt;

***

### spawn()

```ts
spawn(params, origin?): Promise<{
  handle: number;
}>;
```

Defined in: [packages/core/src/orchestrator/handles.ts:159](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L159)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | \{ `agentType`: `string`; `approach?`: `string`; `budgetUsd?`: `number`; `lineage?`: \{ `causeRef`: `number`; `continues`: `string`; `relation?`: `string`; \}; `model_hint?`: \{ `startTier?`: `number`; \}; `outputSchemaRef?`: `string`; `prompt`: `string`; `taskClass?`: `string`; `toolsetRef?`: `string`; \} | - |
| `params.agentType` | `string` | - |
| `params.approach?` | `string` | - |
| `params.budgetUsd?` | `number` | - |
| `params.lineage?` | \{ `causeRef`: `number`; `continues`: `string`; `relation?`: `string`; \} | - |
| `params.lineage.causeRef?` | `number` | - |
| `params.lineage.continues?` | `string` | - |
| `params.lineage.relation?` | `string` | - |
| `params.model_hint?` | \{ `startTier?`: `number`; \} | - |
| `params.model_hint.startTier?` | `number` | - |
| `params.outputSchemaRef?` | `string` | - |
| `params.prompt?` | `string` | - |
| `params.taskClass?` | `string` | - |
| `params.toolsetRef?` | `string` | - |
| `origin?` | `"spawn_agent"` \| `"parallel_agents"` | Which spawn tool asked (RV2005): batch seats admit under 'parallel_agents' and skip the sequential roster feasibility (their batchGate already judged the batch entire) and the requireBatchSpawn gate; absent means 'spawn_agent'. |

#### Returns

`Promise`\<\{
  `handle`: `number`;
\}\>

***

### waitForEvents()

```ts
waitForEvents(triggers): Promise<unknown>;
```

Defined in: [packages/core/src/orchestrator/handles.ts:183](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L183)

Sleep until a coalesced WakeDigest (M6-T09).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `triggers` | `unknown` |

#### Returns

`Promise`\&lt;`unknown`\&gt;
