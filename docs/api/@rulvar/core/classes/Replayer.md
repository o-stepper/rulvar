[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Replayer

# Class: Replayer

Defined in: [packages/core/src/journal/replayer.ts:195](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L195)

Per-run journal kernel front end. Everything is per instance: no module
state anywhere.

## Constructors

### Constructor

```ts
new Replayer(options): Replayer;
```

Defined in: [packages/core/src/journal/replayer.ts:214](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L214)

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

Defined in: [packages/core/src/journal/replayer.ts:374](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L374)

The DEF-4 fold over this run's journal (prior plus live appends).

##### Returns

[`ResolutionFold`](/api/@rulvar/core/classes/ResolutionFold.md)

***

### invalidatedSeqs

#### Get Signature

```ts
get invalidatedSeqs(): ReadonlySet<number>;
```

Defined in: [packages/core/src/journal/replayer.ts:351](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L351)

##### Returns

`ReadonlySet`\&lt;`number`\&gt;

## Methods

### abandonBranch()

```ts
abandonBranch(attempt): Promise<ResolutionOutcome>;
```

Defined in: [packages/core/src/journal/replayer.ts:421](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L421)

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

Defined in: [packages/core/src/journal/replayer.ts:379](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L379)

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

Defined in: [packages/core/src/journal/replayer.ts:483](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L483)

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

Defined in: [packages/core/src/journal/replayer.ts:453](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L453)

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

Defined in: [packages/core/src/journal/replayer.ts:589](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L589)

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

Defined in: [packages/core/src/journal/replayer.ts:509](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L509)

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

Defined in: [packages/core/src/journal/replayer.ts:628](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L628)

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

Defined in: [packages/core/src/journal/replayer.ts:347](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L347)

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

Defined in: [packages/core/src/journal/replayer.ts:614](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L614)

The budget ledger fold: usage sums over terminal entries once, never twice; agentsSpawned
counts agent dispatches. Dollars fold on the settled billing basis
(RV801): per provider call where the entry's records cover its
usage, the per-slice aggregate otherwise, the same basis as the
CostReport and the invoice.

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

Defined in: [packages/core/src/journal/replayer.ts:304](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L304)

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

Defined in: [packages/core/src/journal/replayer.ts:338](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L338)

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

Defined in: [packages/core/src/journal/replayer.ts:413](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L413)

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

Defined in: [packages/core/src/journal/replayer.ts:355](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L355)

#### Returns

[`ResumeReport`](/api/@rulvar/core/interfaces/ResumeReport.md)

***

### setAliasDisposition()

```ts
setAliasDisposition(disposition): void;
```

Defined in: [packages/core/src/journal/replayer.ts:329](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L329)

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

Defined in: [packages/core/src/journal/replayer.ts:320](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L320)

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

Defined in: [packages/core/src/journal/replayer.ts:619](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L619)

Read-only view of the appended entries, in per-run total order.

#### Returns

readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[]

***

### suspensionState()

```ts
suspensionState(target): SuspensionState;
```

Defined in: [packages/core/src/journal/replayer.ts:430](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L430)

Pure fold view, snapshot-pinned.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `target` | `number` |

#### Returns

[`SuspensionState`](/api/@rulvar/core/type-aliases/SuspensionState.md)
