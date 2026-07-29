[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Replayer

# Class: Replayer

Defined in: [packages/core/src/journal/replayer.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L130)

Per-run journal kernel front end. Everything is per instance: no module
state anywhere.

## Constructors

### Constructor

```ts
new Replayer(options): Replayer;
```

Defined in: [packages/core/src/journal/replayer.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L149)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `disposition?`: (`op`) => [`OperationDisposition`](/api/@rulvar/core/type-aliases/OperationDisposition.md); `keyRing?`: [`KeyRing`](/api/@rulvar/core/interfaces/KeyRing.md); `largeValueWarnBytes?`: `number`; `lease?`: [`Lease`](/api/@rulvar/core/type-aliases/Lease.md); `leaseOf?`: () => [`Lease`](/api/@rulvar/core/type-aliases/Lease.md) \| `undefined`; `now?`: () => `number`; `onWarn?`: (`msg`) => `void`; `priceUsd?`: (`servedBy`, `usage`) => `number` \| `undefined`; `priorEntries?`: readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[]; `runId`: `string`; `store`: [`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md); `strict?`: `boolean`; \} | - |
| `options.disposition?` | (`op`) => [`OperationDisposition`](/api/@rulvar/core/type-aliases/OperationDisposition.md) | - |
| `options.keyRing?` | [`KeyRing`](/api/@rulvar/core/interfaces/KeyRing.md) | - |
| `options.largeValueWarnBytes?` | `number` | - |
| `options.lease?` | [`Lease`](/api/@rulvar/core/type-aliases/Lease.md) | Queue mode: every append carries this lease so a stale holder's writes are rejected by the fencing epoch (M8 entry amendment). Absent means the single-writer precondition is asserted instead of fenced (the embedded default). |
| `options.leaseOf?` | () => [`Lease`](/api/@rulvar/core/type-aliases/Lease.md) \| `undefined` | Late-bound lease lookup (P0.2): consulted at EVERY append, winning over the static `lease` when it returns one. The engine passes its segment-lease holder here, because the engine-acquired genesis lease exists only after the ownership boot, which runs after this constructor. |
| `options.now?` | () => `number` | - |
| `options.onWarn?` | (`msg`) => `void` | Receives large-value soft warnings (never an error). |
| `options.priceUsd?` | (`servedBy`, `usage`) => `number` \| `undefined` | - |
| `options.priorEntries?` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] | The loaded, normalized prior journal (resume). |
| `options.runId` | `string` | - |
| `options.store` | [`JournalStore`](/api/@rulvar/core/interfaces/JournalStore.md) | - |
| `options.strict?` | `boolean` | Replay-strict: any live-class match throws JournalMissError. |

#### Returns

`Replayer`

## Accessors

### fold

#### Get Signature

```ts
get fold(): ResolutionFold;
```

Defined in: [packages/core/src/journal/replayer.ts:309](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L309)

The DEF-4 fold over this run's journal (prior plus live appends).

##### Returns

[`ResolutionFold`](/api/@rulvar/core/classes/ResolutionFold.md)

***

### invalidatedSeqs

#### Get Signature

```ts
get invalidatedSeqs(): ReadonlySet<number>;
```

Defined in: [packages/core/src/journal/replayer.ts:286](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L286)

##### Returns

`ReadonlySet`\&lt;`number`\&gt;

## Methods

### abandonBranch()

```ts
abandonBranch(attempt): Promise<ResolutionOutcome>;
```

Defined in: [packages/core/src/journal/replayer.ts:356](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L356)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `attempt` | [`AbandonAttempt`](/api/@rulvar/core/type-aliases/AbandonAttempt.md) |

#### Returns

`Promise`\&lt;[`ResolutionOutcome`](/api/@rulvar/core/type-aliases/ResolutionOutcome.md)\&gt;

***

### appendRefEntry()

```ts
appendRefEntry(input): Promise<JournalEntry>;
```

Defined in: [packages/core/src/journal/replayer.ts:314](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L314)

Ref-entry append used by the ResolutionArbiter; O2-checked by shape validation.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | \{ `abandon?`: [`AbandonPayload`](/api/@rulvar/core/type-aliases/AbandonPayload.md); `kind`: `"resolution"` \| `"abandon"`; `ref`: `number`; `resolution?`: [`ResolutionPayload`](/api/@rulvar/core/type-aliases/ResolutionPayload.md); `scope`: `string`; `spanId`: `string`; \} |
| `input.abandon?` | [`AbandonPayload`](/api/@rulvar/core/type-aliases/AbandonPayload.md) |
| `input.kind` | `"resolution"` \| `"abandon"` |
| `input.ref` | `number` |
| `input.resolution?` | [`ResolutionPayload`](/api/@rulvar/core/type-aliases/ResolutionPayload.md) |
| `input.scope` | `string` |
| `input.spanId` | `string` |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)\&gt;

***

### appendRunning()

```ts
appendRunning(input): Promise<JournalEntry>;
```

Defined in: [packages/core/src/journal/replayer.ts:418](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L418)

Two-phase dispatch: the running entry (kinds agent, step, child).
`value` is legal on child dispatches only: the child payload
`{ workflow, childScope }` lets the abandon fold compute the child's
transitive scope coverage (M6-T06). Values
never enter identity.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`BaseAppend`](/api/@rulvar/core/interfaces/BaseAppend.md) & \{ `memoizeOutcome?`: `boolean`; `value?`: `unknown`; \} |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)\&gt;

***

### appendSinglePhase()

```ts
appendSinglePhase(input): Promise<JournalEntry>;
```

Defined in: [packages/core/src/journal/replayer.ts:388](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L388)

Single-phase fact entries: rand, decisions, termination facts.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`SinglePhaseAppend`](/api/@rulvar/core/interfaces/SinglePhaseAppend.md) |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)\&gt;

***

### appendSuspended()

```ts
appendSuspended(input): Promise<JournalEntry>;
```

Defined in: [packages/core/src/journal/replayer.ts:518](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L518)

Suspended kinds (external, approval): appended once, closed by ref-entries (M2).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`SuspendedAppend`](/api/@rulvar/core/interfaces/SuspendedAppend.md) |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)\&gt;

***

### appendTerminal()

```ts
appendTerminal(runningSeq, patch): Promise<JournalEntry>;
```

Defined in: [packages/core/src/journal/replayer.ts:444](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L444)

Two-phase completion: a terminal entry referencing the running entry
by ref. Scope, key, ordinal, kind, and hashVersion are inherited from
the running entry (running/terminal pairs are always single-version;
the pair shares one ordinal because it is one logical operation).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runningSeq` | `number` |
| `patch` | [`TerminalPatch`](/api/@rulvar/core/interfaces/TerminalPatch.md) |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)\&gt;

***

### flush()

```ts
flush(): Promise<void>;
```

Defined in: [packages/core/src/journal/replayer.ts:595](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L595)

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

Defined in: [packages/core/src/journal/replayer.ts:282](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L282)

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

Defined in: [packages/core/src/journal/replayer.ts:540](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L540)

The budget ledger fold: usage sums over terminal entries once, never twice; agentsSpawned
counts agent dispatches.

#### Returns

[`Ledger`](/api/@rulvar/core/interfaces/Ledger.md)

***

### match()

```ts
match(
   scope, 
   identity, 
   mode): MatchResult;
```

Defined in: [packages/core/src/journal/replayer.ts:239](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L239)

Forward-matches one live call against the prior journal. Fresh
runs always miss; the M2-T06 predicate is injected
through setDisposition once folds are built.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `scope` | `string` |
| `identity` | [`IdentityInput`](/api/@rulvar/core/type-aliases/IdentityInput.md) |
| `mode` | [`ReplayMode`](/api/@rulvar/core/type-aliases/ReplayMode.md) |

#### Returns

[`MatchResult`](/api/@rulvar/core/type-aliases/MatchResult.md)

***

### registerAlias()

```ts
registerAlias(donorPrefix, targetPrefix): void;
```

Defined in: [packages/core/src/journal/replayer.ts:273](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L273)

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

Defined in: [packages/core/src/journal/replayer.ts:348](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L348)

Submits a resolution attempt through the per-target FIFO arbiter.
Losing attempts are journaled noops.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `target` | `number` |
| `attempt` | [`ResolutionAttempt`](/api/@rulvar/core/type-aliases/ResolutionAttempt.md) |

#### Returns

`Promise`\&lt;[`ResolutionOutcome`](/api/@rulvar/core/type-aliases/ResolutionOutcome.md)\&gt;

***

### resumeReport()

```ts
resumeReport(): ResumeReport;
```

Defined in: [packages/core/src/journal/replayer.ts:290](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L290)

#### Returns

[`ResumeReport`](/api/@rulvar/core/interfaces/ResumeReport.md)

***

### setAliasDisposition()

```ts
setAliasDisposition(disposition): void;
```

Defined in: [packages/core/src/journal/replayer.ts:264](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L264)

The disposition for alias-sourced candidates (DEF-5):
bypasses the abandon overlay so donor entries regain their
pre-abandon terminal status when matched through the alias.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `disposition` | (`op`) => [`OperationDisposition`](/api/@rulvar/core/type-aliases/OperationDisposition.md) |

#### Returns

`void`

***

### setDisposition()

```ts
setDisposition(disposition): void;
```

Defined in: [packages/core/src/journal/replayer.ts:255](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L255)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `disposition` | (`op`) => [`OperationDisposition`](/api/@rulvar/core/type-aliases/OperationDisposition.md) |

#### Returns

`void`

***

### snapshot()

```ts
snapshot(): readonly JournalEntry[];
```

Defined in: [packages/core/src/journal/replayer.ts:586](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L586)

Read-only view of the appended entries, in per-run total order.

#### Returns

readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[]

***

### suspensionState()

```ts
suspensionState(target): SuspensionState;
```

Defined in: [packages/core/src/journal/replayer.ts:365](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L365)

Pure fold view, snapshot-pinned.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `target` | `number` |

#### Returns

[`SuspensionState`](/api/@rulvar/core/type-aliases/SuspensionState.md)
