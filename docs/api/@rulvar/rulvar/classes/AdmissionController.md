[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AdmissionController

# Class: AdmissionController

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

## Constructors

### Constructor

```ts
new AdmissionController(options): AdmissionController;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `budget`: [`RunBudget`](/api/@rulvar/rulvar/classes/RunBudget.md); `childBudgetFraction?`: `number`; `flatReserveUsd?`: `number`; `lineage?`: \{ `journalView`: () => readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]; `limits?`: \| `Record`\&lt;`string`, `unknown`\&gt; \| `Partial`\&lt;[`EscalationLimits`](/api/@rulvar/rulvar/interfaces/EscalationLimits.md)\&gt;; \}; `maxChildrenPerNode?`: `number`; `maxDepth?`: `number`; `maxTotalSpawns?`: `number`; `mintId?`: () => `string`; \} | - |
| `options.budget` | [`RunBudget`](/api/@rulvar/rulvar/classes/RunBudget.md) | - |
| `options.childBudgetFraction?` | `number` | - |
| `options.flatReserveUsd?` | `number` | - |
| `options.lineage?` | \{ `journalView`: () => readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]; `limits?`: \| `Record`\&lt;`string`, `unknown`\&gt; \| `Partial`\&lt;[`EscalationLimits`](/api/@rulvar/rulvar/interfaces/EscalationLimits.md)\&gt;; \} | The lineage binding (DEF-3): a journal view for the pure counter folds plus the configured limits. Without it the controller mints and embeds lineage but enforces no lineage limits (unit contexts). |
| `options.lineage.journalView` | () => readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] | - |
| `options.lineage.limits?` | \| `Record`\&lt;`string`, `unknown`\&gt; \| `Partial`\&lt;[`EscalationLimits`](/api/@rulvar/rulvar/interfaces/EscalationLimits.md)\&gt; | - |
| `options.maxChildrenPerNode?` | `number` | - |
| `options.maxDepth?` | `number` | - |
| `options.maxTotalSpawns?` | `number` | - |
| `options.mintId?` | () => `string` | - |

#### Returns

`AdmissionController`

## Accessors

### escalationLimits

#### Get Signature

```ts
get escalationLimits(): EscalationLimits;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The validated lineage limits this controller enforces (DEF-3).

##### Returns

[`EscalationLimits`](/api/@rulvar/rulvar/interfaces/EscalationLimits.md)

***

### termination

#### Get Signature

```ts
get termination(): 
  | TerminationAccount
  | undefined;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The bound account, when this is a PlanRunner run (DEF-2).

##### Returns

  \| [`TerminationAccount`](/api/@rulvar/rulvar/classes/TerminationAccount.md)
  \| `undefined`

## Methods

### admit()

```ts
admit(spec, options?): AdmissionDecision;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Evaluates one spawn live, strictly BEFORE its decision entry is
appended. On admit the reserve is committed on the whole ancestor
account chain atomically with the evaluation; the caller journals the
returned decision and only then produces effects (child account,
dispatch). On reject nothing is committed and the reject verdict is
journaled by the caller so replay re-delivers it without
re-evaluation.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`AdmitSpec`](/api/@rulvar/rulvar/interfaces/AdmitSpec.md) |
| `options?` | \{ `commitReserve?`: `boolean`; \} |
| `options.commitReserve?` | `boolean` |

#### Returns

[`AdmissionDecision`](/api/@rulvar/rulvar/interfaces/AdmissionDecision.md)

***

### bindTermination()

```ts
bindTermination(account): void;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Binds the run's TerminationAccount (DEF-2; PlanRunner runs only,
docs/07 section 1): from bind time on, every admitted spawn of any
origin debits one spawnUnit atomically with its decision entry, and
a declared ladder longer than the frozen kMax rejects with
ladder_exceeds_frozen. Non-PlanRunner runs never bind an account and
keep the engine lifetime cap semantics unchanged.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `account` | [`TerminationAccount`](/api/@rulvar/rulvar/classes/TerminationAccount.md) |

#### Returns

`void`

***

### evaluateLineage()

```ts
evaluateLineage(spec): {
  decision:   | {
     kind: "ok";
     lineage: SpawnLineage;
   }
     | {
     kind: "reject";
     reason: {
        code: "lineage_busy" | "lineage_exhausted";
     };
   };
  statsBefore?: LineageStats;
};
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The lineage half of admission (DEF-3, docs/03 section 10.5): folds are
computed live STRICTLY BEFORE the carrying decision entry is appended;
the caller embeds the returned block in the entry and replay reads it
back byte-exact. Enforces the single-live-attempt invariant
(`lineage_busy`) and monotonic attempt consumption
(`lineage_exhausted`); never touches budget or structural limits.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | \{ `ancestry?`: `string`[]; `approach?`: `string`; `lineage?`: [`SpawnLineageOpt`](/api/@rulvar/rulvar/interfaces/SpawnLineageOpt.md); `name`: `string`; `signature?`: `Partial`\&lt;[`ApproachSignatureInputs`](/api/@rulvar/rulvar/interfaces/ApproachSignatureInputs.md)\&gt;; \} |
| `spec.ancestry?` | `string`[] |
| `spec.approach?` | `string` |
| `spec.lineage?` | [`SpawnLineageOpt`](/api/@rulvar/rulvar/interfaces/SpawnLineageOpt.md) |
| `spec.name` | `string` |
| `spec.signature?` | `Partial`\&lt;[`ApproachSignatureInputs`](/api/@rulvar/rulvar/interfaces/ApproachSignatureInputs.md)\&gt; |

#### Returns

```ts
{
  decision:   | {
     kind: "ok";
     lineage: SpawnLineage;
   }
     | {
     kind: "reject";
     reason: {
        code: "lineage_busy" | "lineage_exhausted";
     };
   };
  statsBefore?: LineageStats;
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `decision` | \| \{ `kind`: `"ok"`; `lineage`: [`SpawnLineage`](/api/@rulvar/rulvar/interfaces/SpawnLineage.md); \} \| \{ `kind`: `"reject"`; `reason`: \{ `code`: `"lineage_busy"` \| `"lineage_exhausted"`; \}; \} | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| `statsBefore?` | [`LineageStats`](/api/@rulvar/rulvar/interfaces/LineageStats.md) | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |

***

### lineage()

```ts
lineage(): 
  | LineageIndex
  | undefined;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The lineage counter folds over the run journal (absorbed lazily).

#### Returns

  \| [`LineageIndex`](/api/@rulvar/rulvar/classes/LineageIndex.md)
  \| `undefined`

***

### recoverChild()

```ts
recoverChild(nodeKey): void;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Resume roll-forward for an orchestrator child (M6-T07): restores the
children-quota counter only. The budget seed already counts settled
agent dispatches, and an in-flight child re-commits its reserve
through the ctx.agent dispatch path.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `nodeKey` | `string` |

#### Returns

`void`

***

### recoverInFlight()

```ts
recoverInFlight(parentAccountScope, verdict): void;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Resume roll-forward for an admission whose decision entry exists but
whose child has NOT settled: re-applies the recorded reserve and
counters without re-evaluating any limit (docs/07, 7.1: replay never
re-evaluates admission; docs/06, 5.1: reserves are recovered, never
re-estimated).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `parentAccountScope` | `string` |
| `verdict` | [`AdmitVerdict`](/api/@rulvar/rulvar/type-aliases/AdmitVerdict.md) |

#### Returns

`void`

***

### recoverSettled()

```ts
recoverSettled(parentAccountScope): void;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Resume roll-forward for a child that already SETTLED before the
resume: re-registers the counters (maxChildrenPerNode, the lifetime
cap, statsBefore fidelity) without committing any reserve; the spend
itself sits in the root ledger seed (docs/03, 13.3).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `parentAccountScope` | `string` |

#### Returns

`void`

***

### registerLineageAdmit()

```ts
registerLineageAdmit(logicalTaskId): void;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Registers a live lineage admit the moment its caller commits to
appending the decision entry, closing the single-live-attempt window
until the journal absorbs the entry (DEF-3).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `logicalTaskId` | `string` |

#### Returns

`void`
