[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / Replayer

# Class: Replayer

Defined in: `packages/core/dist/index.d.ts`

Per-run journal kernel front end. Everything is per instance: no module
state anywhere.

## Constructors

### Constructor

```ts
new Replayer(options): Replayer;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `disposition?`: (`op`) => [`OperationDisposition`](/api/@rulvar/rulvar/type-aliases/OperationDisposition.md); `keyRing?`: [`KeyRing`](/api/@rulvar/rulvar/interfaces/KeyRing.md); `largeValueWarnBytes?`: `number`; `lease?`: [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md); `now?`: () => `number`; `onWarn?`: (`msg`) => `void`; `priceUsd?`: (`servedBy`, `usage`) => `number` \| `undefined`; `priorEntries?`: readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]; `runId`: `string`; `store`: [`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md); `strict?`: `boolean`; \} | - |
| `options.disposition?` | (`op`) => [`OperationDisposition`](/api/@rulvar/rulvar/type-aliases/OperationDisposition.md) | - |
| `options.keyRing?` | [`KeyRing`](/api/@rulvar/rulvar/interfaces/KeyRing.md) | - |
| `options.largeValueWarnBytes?` | `number` | - |
| `options.lease?` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) | Queue mode: every append carries this lease so a stale holder's writes are rejected by the fencing epoch (M8 entry amendment). Absent means the single-writer precondition is asserted instead of fenced (the embedded default). |
| `options.now?` | () => `number` | - |
| `options.onWarn?` | (`msg`) => `void` | - |
| `options.priceUsd?` | (`servedBy`, `usage`) => `number` \| `undefined` | - |
| `options.priorEntries?` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] | - |
| `options.runId` | `string` | - |
| `options.store` | [`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md) | - |
| `options.strict?` | `boolean` | - |

#### Returns

`Replayer`

## Accessors

### fold

#### Get Signature

```ts
get fold(): ResolutionFold;
```

Defined in: `packages/core/dist/index.d.ts`

The DEF-4 fold over this run's journal (prior plus live appends).

##### Returns

[`ResolutionFold`](/api/@rulvar/rulvar/classes/ResolutionFold.md)

***

### invalidatedSeqs

#### Get Signature

```ts
get invalidatedSeqs(): ReadonlySet<number>;
```

Defined in: `packages/core/dist/index.d.ts`

##### Returns

`ReadonlySet`\&lt;`number`\&gt;

## Methods

### abandonBranch()

```ts
abandonBranch(attempt): Promise<ResolutionOutcome>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `attempt` | [`AbandonAttempt`](/api/@rulvar/rulvar/type-aliases/AbandonAttempt.md) |

#### Returns

`Promise`\&lt;[`ResolutionOutcome`](/api/@rulvar/rulvar/type-aliases/ResolutionOutcome.md)\&gt;

***

### appendRefEntry()

```ts
appendRefEntry(input): Promise<JournalEntry>;
```

Defined in: `packages/core/dist/index.d.ts`

Ref-entry append used by the ResolutionArbiter; O2-checked by shape validation.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `abandon?`: [`AbandonPayload`](/api/@rulvar/rulvar/type-aliases/AbandonPayload.md); `kind`: `"resolution"` \| `"abandon"`; `ref`: `number`; `resolution?`: [`ResolutionPayload`](/api/@rulvar/rulvar/type-aliases/ResolutionPayload.md); `scope`: `string`; `spanId`: `string`; \} |
| `input.abandon?` | [`AbandonPayload`](/api/@rulvar/rulvar/type-aliases/AbandonPayload.md) |
| `input.kind` | `"resolution"` \| `"abandon"` |
| `input.ref` | `number` |
| `input.resolution?` | [`ResolutionPayload`](/api/@rulvar/rulvar/type-aliases/ResolutionPayload.md) |
| `input.scope` | `string` |
| `input.spanId` | `string` |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)\&gt;

***

### appendRunning()

```ts
appendRunning(input): Promise<JournalEntry>;
```

Defined in: `packages/core/dist/index.d.ts`

Two-phase dispatch: the running entry (kinds agent, step, child).
`value` is legal on child dispatches only: the child payload
`{ workflow, childScope }` lets the abandon fold compute the child's
transitive scope coverage (M6-T06). Values
never enter identity.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | `BaseAppend` & \{ `memoizeOutcome?`: `boolean`; `value?`: `unknown`; \} |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)\&gt;

***

### appendSinglePhase()

```ts
appendSinglePhase(input): Promise<JournalEntry>;
```

Defined in: `packages/core/dist/index.d.ts`

Single-phase fact entries: rand, decisions, termination facts.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`SinglePhaseAppend`](/api/@rulvar/rulvar/interfaces/SinglePhaseAppend.md) |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)\&gt;

***

### appendSuspended()

```ts
appendSuspended(input): Promise<JournalEntry>;
```

Defined in: `packages/core/dist/index.d.ts`

Suspended kinds (external, approval): appended once, closed by ref-entries (M2).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`SuspendedAppend`](/api/@rulvar/rulvar/interfaces/SuspendedAppend.md) |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)\&gt;

***

### appendTerminal()

```ts
appendTerminal(runningSeq, patch): Promise<JournalEntry>;
```

Defined in: `packages/core/dist/index.d.ts`

Two-phase completion: a terminal entry referencing the running entry
by ref. Scope, key, ordinal, kind, and hashVersion are inherited from
the running entry (running/terminal pairs are always single-version;
the pair shares one ordinal because it is one logical operation).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runningSeq` | `number` |
| `patch` | [`TerminalPatch`](/api/@rulvar/rulvar/interfaces/TerminalPatch.md) |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)\&gt;

***

### flush()

```ts
flush(): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

Resolves when every append enqueued so far has persisted. Deterministic
shims journal fire-and-forget; the engine awaits this before settling a
run.

#### Returns

`Promise`\&lt;`void`\&gt;

***

### invalidate()

```ts
invalidate(seq): void;
```

Defined in: `packages/core/dist/index.d.ts`

invalidate/retry: explicit unpinning of a
memoized failure; the invalidated entry reruns on this resume. The
safety boundary is an open question.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `seq` | `number` |

#### Returns

`void`

***

### ledger()

```ts
ledger(): Ledger;
```

Defined in: `packages/core/dist/index.d.ts`

The budget ledger fold: usage sums over terminal entries exactly once; agentsSpawned
counts agent dispatches.

#### Returns

[`Ledger`](/api/@rulvar/rulvar/interfaces/Ledger.md)

***

### match()

```ts
match(
   scope, 
   identity, 
   mode): MatchResult;
```

Defined in: `packages/core/dist/index.d.ts`

Forward-matches one live call against the prior journal. Fresh
runs always miss; the M2-T06 predicate is injected
through setDisposition once folds are built.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | `string` |
| `identity` | [`IdentityInput`](/api/@rulvar/rulvar/type-aliases/IdentityInput.md) |
| `mode` | [`ReplayMode`](/api/@rulvar/rulvar/type-aliases/ReplayMode.md) |

#### Returns

[`MatchResult`](/api/@rulvar/rulvar/type-aliases/MatchResult.md)

***

### registerAlias()

```ts
registerAlias(donorPrefix, targetPrefix): void;
```

Defined in: `packages/core/dist/index.d.ts`

Registers a node.link scope-prefix rewrite (DEF-5):
donorPrefix forward-matches into targetPrefix at every nested level.
Idempotent; the alias map is rebuilt by fold on resume.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `donorPrefix` | `string` |
| `targetPrefix` | `string` |

#### Returns

`void`

***

### resolveSuspended()

```ts
resolveSuspended(target, attempt): Promise<ResolutionOutcome>;
```

Defined in: `packages/core/dist/index.d.ts`

Submits a resolution attempt through the per-target FIFO arbiter.
Losing attempts are journaled noops.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `target` | `number` |
| `attempt` | [`ResolutionAttempt`](/api/@rulvar/rulvar/type-aliases/ResolutionAttempt.md) |

#### Returns

`Promise`\&lt;[`ResolutionOutcome`](/api/@rulvar/rulvar/type-aliases/ResolutionOutcome.md)\&gt;

***

### resumeReport()

```ts
resumeReport(): ResumeReport;
```

Defined in: `packages/core/dist/index.d.ts`

#### Returns

[`ResumeReport`](/api/@rulvar/rulvar/interfaces/ResumeReport.md)

***

### setAliasDisposition()

```ts
setAliasDisposition(disposition): void;
```

Defined in: `packages/core/dist/index.d.ts`

The disposition for alias-sourced candidates (DEF-5):
bypasses the abandon overlay so donor entries regain their
pre-abandon terminal status when matched through the alias.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `disposition` | (`op`) => [`OperationDisposition`](/api/@rulvar/rulvar/type-aliases/OperationDisposition.md) |

#### Returns

`void`

***

### setDisposition()

```ts
setDisposition(disposition): void;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `disposition` | (`op`) => [`OperationDisposition`](/api/@rulvar/rulvar/type-aliases/OperationDisposition.md) |

#### Returns

`void`

***

### snapshot()

```ts
snapshot(): readonly JournalEntry[];
```

Defined in: `packages/core/dist/index.d.ts`

Read-only view of the appended entries, in per-run total order.

#### Returns

readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]

***

### suspensionState()

```ts
suspensionState(target): SuspensionState;
```

Defined in: `packages/core/dist/index.d.ts`

Pure fold view, snapshot-pinned.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `target` | `number` |

#### Returns

[`SuspensionState`](/api/@rulvar/rulvar/type-aliases/SuspensionState.md)
