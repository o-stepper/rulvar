[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Engine

# Interface: Engine

Defined in: [packages/core/src/engine/engine.ts:305](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L305)

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-stores"></a> `stores` | `readonly` | \{ `journal`: [`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md); `transcripts`: [`TranscriptStore`](/api/@rulvar/core/interfaces/TranscriptStore.md); \} | The engine's configured stores, exposed for shells and hosts (M8 entry amendment: the journal store comes from the engine). Exactly the instances createEngine received, or the defaults it built; no store contract widens through this accessor. With a serialization hook configured these are the HOOKED wrappers, so every reader passes the one policy point (M8-T04). | [packages/core/src/engine/engine.ts:337](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L337) |
| `stores.journal` | `public` | [`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md) | - | [packages/core/src/engine/engine.ts:337](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L337) |
| `stores.transcripts` | `public` | [`TranscriptStore`](/api/@rulvar/core/interfaces/TranscriptStore.md) | - | [packages/core/src/engine/engine.ts:337](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L337) |

## Methods

### deleteRun()

```ts
deleteRun(runId): Promise<void>;
```

Defined in: [packages/core/src/engine/engine.ts:343](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L343)

Retention (OQ-20 executed at M8-T04): deletes every
blob transcripts.list(runId) returns, then the journal; no orphan
blobs survive. The caller owns the decision that the run is done.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;`void`\&gt;

***

### profileCard()

```ts
profileCard(names?): string;
```

Defined in: [packages/core/src/engine/engine.ts:327](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L327)

Renders the registered agent profiles into the shared vocabulary
card, optionally filtered to `names`; the registry itself stays
private to the engine (M6-T05 amendment). Unknown names are ignored.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `names?` | readonly `string`[] |

#### Returns

`string`

***

### pruneRun()

```ts
pruneRun(runId): Promise<number>;
```

Defined in: [packages/core/src/engine/engine.ts:351](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L351)

Checkpoint pruning (OQ-20 executed at M8-T04):
deletes checkpoint blobs of ok-terminal attempts that no other
entry references; returns the count. Parked, cancelled, escalated,
and hanging attempts keep theirs (park/unpark, DEF-5 retention, and
dangling redispatch boot from them).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;`number`\&gt;

***

### resume()

```ts
resume<A, R>(
   runId, 
   wf?, 
options?): ResumeHandle<R>;
```

Defined in: [packages/core/src/engine/engine.ts:317](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L317)

Rebinds a journal to a workflow definition and resumes. Requires wf
for in-process workflows;
a name mismatch is a typed ConfigError; a body-hash mismatch warns
loudly and proceeds (the journal decides replay per content keys).
A compiled run resumes WITHOUT wf: the engine rehydrates the
persisted source pinned by workflowHash; supplying a compiled wf
whose source hash differs from the recorded one is a typed
ConfigError (M6-T02).

#### Type Parameters

| Type Parameter |
| ------ |
| `A` |
| `R` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `wf?` | \| [`CompiledWorkflow`](/api/@rulvar/core/interfaces/CompiledWorkflow.md) \| [`Workflow`](/api/@rulvar/core/interfaces/Workflow.md)\&lt;`A`, `R`\&gt; |
| `options?` | [`ResumeOptions`](/api/@rulvar/core/interfaces/ResumeOptions.md) |

#### Returns

[`ResumeHandle`](/api/@rulvar/core/interfaces/ResumeHandle.md)\&lt;`R`\&gt;

***

### run()

```ts
run<A, R>(
   wf, 
   args, 
opts?): RunHandle<R>;
```

Defined in: [packages/core/src/engine/engine.ts:306](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L306)

#### Type Parameters

| Type Parameter |
| ------ |
| `A` |
| `R` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `wf` | \| [`Workflow`](/api/@rulvar/core/interfaces/Workflow.md)\&lt;`A`, `R`\&gt; \| [`CompiledWorkflow`](/api/@rulvar/core/interfaces/CompiledWorkflow.md) |
| `args` | `A` |
| `opts?` | [`RunOptions`](/api/@rulvar/core/interfaces/RunOptions.md) |

#### Returns

[`RunHandle`](/api/@rulvar/core/interfaces/RunHandle.md)\&lt;`R`\&gt;
