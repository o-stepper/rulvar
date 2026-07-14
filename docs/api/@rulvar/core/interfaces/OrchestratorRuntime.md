[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OrchestratorRuntime

# Interface: OrchestratorRuntime

Defined in: [packages/core/src/orchestrator/handles.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L45)

The engine seam the spawn tools close over (never on ToolContext).

## Methods

### awaitAll()

```ts
awaitAll(handles): Promise<TaskDigest[]>;
```

Defined in: [packages/core/src/orchestrator/handles.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L58)

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

Defined in: [packages/core/src/orchestrator/handles.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L57)

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

Defined in: [packages/core/src/orchestrator/handles.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L59)

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

### spawn()

```ts
spawn(params): Promise<{
  handle: number;
}>;
```

Defined in: [packages/core/src/orchestrator/handles.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L46)

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

Defined in: [packages/core/src/orchestrator/handles.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L61)

Sleep until a coalesced WakeDigest (M6-T09).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `triggers` | `unknown` |

#### Returns

`Promise`\&lt;`unknown`\&gt;
