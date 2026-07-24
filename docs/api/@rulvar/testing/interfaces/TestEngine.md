[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / TestEngine

# Interface: TestEngine

Defined in: [packages/testing/src/test-engine.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/test-engine.ts#L27)

## Extends

- [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md)

## Properties

| Property | Modifier | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-fake"></a> `fake` | `public` | [`FakeAdapter`](/api/@rulvar/testing/classes/FakeAdapter.md) | The adapter instance, for call-level assertions. | - | [packages/testing/src/test-engine.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/test-engine.ts#L30) |
| <a id="property-store"></a> `store` | `public` | [`InMemoryStore`](/api/@rulvar/rulvar/classes/InMemoryStore.md) | The backing journal store (journal capture for replay-strict tests). | - | [packages/testing/src/test-engine.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/test-engine.ts#L32) |
| <a id="property-stores"></a> `stores` | `readonly` | \{ `journal`: [`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md); `transcripts`: [`TranscriptStore`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md); \} | The engine's configured stores, exposed for shells and hosts (M8 entry amendment: the journal store comes from the engine). Exactly the instances createEngine received, or the defaults it built; no store contract widens through this accessor. With a serialization hook configured these are the HOOKED wrappers, so every reader passes the one policy point (M8-T04). | [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md).[`stores`](/api/@rulvar/rulvar/interfaces/Engine.md#property-stores) | `packages/core/dist/index.d.ts` |
| `stores.journal` | `public` | [`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md) | - | - | `packages/core/dist/index.d.ts` |
| `stores.transcripts` | `public` | [`TranscriptStore`](/api/@rulvar/rulvar/interfaces/TranscriptStore.md) | - | - | `packages/core/dist/index.d.ts` |

## Methods

### deleteRun()

```ts
deleteRun(runId, opts?): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

Retention (OQ-20 executed at M8-T04): deletes every
blob transcripts.list(runId) returns, then the journal; no orphan
blobs survive. The caller owns the decision that the run is done.
A caller holding the run's lease passes it via `opts.lease` (the
queue worker's retention path does), so a fencedWrites store
refuses the cascade from a superseded holder; without a lease the
deletes assert the single-writer precondition as before.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `opts?` | \{ `lease?`: [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md); \} |
| `opts.lease?` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md).[`deleteRun`](/api/@rulvar/rulvar/interfaces/Engine.md#deleterun)

***

### exportRun()

```ts
exportRun(runId): Promise<RunExport>;
```

Defined in: `packages/core/dist/index.d.ts`

Portable run export (RV-217): the meta record, every journal
entry, and every transcript blob, read through Engine.stores (the
one policy point), so an encrypted deployment exports PLAINTEXT
for a subject-access request or a store migration, without raw
store spelunking. Blobs are materialized in memory; export runs
one at a time, not catalogs.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;[`RunExport`](/api/@rulvar/rulvar/interfaces/RunExport.md)\&gt;

#### Inherited from

[`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md).[`exportRun`](/api/@rulvar/rulvar/interfaces/Engine.md#exportrun)

***

### importRun()

```ts
importRun(bundle): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

Imports a bundle produced by exportRun, under its ORIGINAL runId
(transcript refs and journal fields embed it; rewriting ids is
deliberately out of scope). Writes through Engine.stores, so an
encrypting target re-encrypts under its own policy. Refuses typed
when the run already exists in the target store, so an import can
never interleave with live history.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `bundle` | [`RunExport`](/api/@rulvar/rulvar/interfaces/RunExport.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md).[`importRun`](/api/@rulvar/rulvar/interfaces/Engine.md#importrun)

***

### profileCard()

```ts
profileCard(names?): string;
```

Defined in: `packages/core/dist/index.d.ts`

Renders the registered agent profiles into the shared vocabulary
card, optionally filtered to `names`; the registry itself stays
private to the engine (M6-T05 amendment). Unknown names are ignored.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `names?` | readonly `string`[] |

#### Returns

`string`

#### Inherited from

[`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md).[`profileCard`](/api/@rulvar/rulvar/interfaces/Engine.md#profilecard)

***

### pruneRun()

```ts
pruneRun(runId, opts?): Promise<number>;
```

Defined in: `packages/core/dist/index.d.ts`

Checkpoint pruning (OQ-20 executed at M8-T04):
deletes checkpoint blobs of ok-terminal attempts that no other
entry references; returns the count. Parked, cancelled, escalated,
and hanging attempts keep theirs (park/unpark, DEF-5 retention, and
dangling redispatch boot from them). `opts.lease` rides each blob
delete exactly like the deleteRun cascade.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `opts?` | \{ `lease?`: [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md); \} |
| `opts.lease?` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`number`\&gt;

#### Inherited from

[`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md).[`pruneRun`](/api/@rulvar/rulvar/interfaces/Engine.md#prunerun)

***

### resume()

```ts
resume<A, R>(
   runId, 
   wf?, 
options?): ResumeHandle<R>;
```

Defined in: `packages/core/dist/index.d.ts`

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
| `wf?` | \| [`Workflow`](/api/@rulvar/rulvar/interfaces/Workflow.md)\&lt;`A`, `R`\&gt; \| [`CompiledWorkflow`](/api/@rulvar/rulvar/interfaces/CompiledWorkflow.md) |
| `options?` | [`ResumeOptions`](/api/@rulvar/rulvar/interfaces/ResumeOptions.md) |

#### Returns

[`ResumeHandle`](/api/@rulvar/rulvar/interfaces/ResumeHandle.md)\&lt;`R`\&gt;

#### Inherited from

[`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md).[`resume`](/api/@rulvar/rulvar/interfaces/Engine.md#resume)

***

### run()

```ts
run<A, R>(
   wf, 
   args, 
opts?): TestRunHandle<R>;
```

Defined in: [packages/testing/src/test-engine.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/test-engine.ts#L28)

#### Type Parameters

| Type Parameter |
| ------ |
| `A` |
| `R` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `wf` | [`Workflow`](/api/@rulvar/rulvar/interfaces/Workflow.md)\&lt;`A`, `R`\&gt; |
| `args` | `A` |
| `opts?` | [`RunOptions`](/api/@rulvar/rulvar/interfaces/RunOptions.md) |

#### Returns

[`TestRunHandle`](/api/@rulvar/testing/interfaces/TestRunHandle.md)\&lt;`R`\&gt;

#### Overrides

[`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md).[`run`](/api/@rulvar/rulvar/interfaces/Engine.md#run)
