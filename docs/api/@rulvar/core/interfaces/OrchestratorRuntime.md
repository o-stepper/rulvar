[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OrchestratorRuntime

# Interface: OrchestratorRuntime

Defined in: [packages/core/src/orchestrator/handles.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L97)

The engine seam the spawn tools close over (never on ToolContext).

## Methods

### awaitAll()

```ts
awaitAll(handles): Promise<TaskDigest[]>;
```

Defined in: [packages/core/src/orchestrator/handles.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L110)

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

Defined in: [packages/core/src/orchestrator/handles.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L109)

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

Defined in: [packages/core/src/orchestrator/handles.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L111)

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

Defined in: [packages/core/src/orchestrator/handles.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L115)

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

### readChildArtifact()

```ts
readChildArtifact(
   handle, 
   artifactId, 
opts?): Promise<ChildArtifactPage>;
```

Defined in: [packages/core/src/orchestrator/handles.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L120)

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
spawn(params): Promise<{
  handle: number;
}>;
```

Defined in: [packages/core/src/orchestrator/handles.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L98)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | \{ `agentType`: `string`; `approach?`: `string`; `budgetUsd?`: `number`; `lineage?`: \{ `causeRef`: `number`; `continues`: `string`; `relation?`: `string`; \}; `model_hint?`: \{ `startTier?`: `number`; \}; `outputSchemaRef?`: `string`; `prompt`: `string`; `taskClass?`: `string`; `toolsetRef?`: `string`; \} |
| `params.agentType` | `string` |
| `params.approach?` | `string` |
| `params.budgetUsd?` | `number` |
| `params.lineage?` | \{ `causeRef`: `number`; `continues`: `string`; `relation?`: `string`; \} |
| `params.lineage.causeRef` | `number` |
| `params.lineage.continues` | `string` |
| `params.lineage.relation?` | `string` |
| `params.model_hint?` | \{ `startTier?`: `number`; \} |
| `params.model_hint.startTier?` | `number` |
| `params.outputSchemaRef?` | `string` |
| `params.prompt` | `string` |
| `params.taskClass?` | `string` |
| `params.toolsetRef?` | `string` |

#### Returns

`Promise`\<\{
  `handle`: `number`;
\}\>

***

### waitForEvents()

```ts
waitForEvents(triggers): Promise<unknown>;
```

Defined in: [packages/core/src/orchestrator/handles.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L113)

Sleep until a coalesced WakeDigest (M6-T09).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `triggers` | `unknown` |

#### Returns

`Promise`\&lt;`unknown`\&gt;
