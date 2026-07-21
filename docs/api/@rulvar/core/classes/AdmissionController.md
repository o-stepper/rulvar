[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdmissionController

# Class: AdmissionController

Defined in: [packages/core/src/orchestrator/admission.ts:232](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L232)

## Constructors

### Constructor

```ts
new AdmissionController(options): AdmissionController;
```

Defined in: [packages/core/src/orchestrator/admission.ts:248](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L248)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `budget`: [`RunBudget`](/api/@rulvar/core/classes/RunBudget.md); `childBudgetFraction?`: `number`; `flatReserveUsd?`: `number`; `lineage?`: \{ `journalView`: () => readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[]; `limits?`: \| `Record`\&lt;`string`, `unknown`\&gt; \| `Partial`\&lt;[`EscalationLimits`](/api/@rulvar/core/interfaces/EscalationLimits.md)\&gt;; \}; `maxChildrenPerNode?`: `number`; `maxDepth?`: `number`; `maxTotalSpawns?`: `number`; `mintId?`: () => `string`; \} | - |
| `options.budget` | [`RunBudget`](/api/@rulvar/core/classes/RunBudget.md) | - |
| `options.childBudgetFraction?` | `number` | - |
| `options.flatReserveUsd?` | `number` | - |
| `options.lineage?` | \{ `journalView`: () => readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[]; `limits?`: \| `Record`\&lt;`string`, `unknown`\&gt; \| `Partial`\&lt;[`EscalationLimits`](/api/@rulvar/core/interfaces/EscalationLimits.md)\&gt;; \} | The lineage binding (DEF-3): a journal view for the pure counter folds plus the configured limits. Without it the controller mints and embeds lineage but enforces no lineage limits (unit contexts). |
| `options.lineage.journalView` | () => readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] | - |
| `options.lineage.limits?` | \| `Record`\&lt;`string`, `unknown`\&gt; \| `Partial`\&lt;[`EscalationLimits`](/api/@rulvar/core/interfaces/EscalationLimits.md)\&gt; | - |
| `options.maxChildrenPerNode?` | `number` | - |
| `options.maxDepth?` | `number` | - |
| `options.maxTotalSpawns?` | `number` | Per-orchestrate spawn cap (maxSpawns); engine lifetime cap applies regardless. |
| `options.mintId?` | () => `string` | - |

#### Returns

`AdmissionController`

## Accessors

### escalationLimits

#### Get Signature

```ts
get escalationLimits(): EscalationLimits;
```

Defined in: [packages/core/src/orchestrator/admission.ts:315](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L315)

The validated lineage limits this controller enforces (DEF-3).

##### Returns

[`EscalationLimits`](/api/@rulvar/core/interfaces/EscalationLimits.md)

***

### termination

#### Get Signature

```ts
get termination(): 
  | TerminationAccount
  | undefined;
```

Defined in: [packages/core/src/orchestrator/admission.ts:335](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L335)

The bound account, when this is a PlanRunner run (DEF-2).

##### Returns

  \| [`TerminationAccount`](/api/@rulvar/core/classes/TerminationAccount.md)
  \| `undefined`

## Methods

### admit()

```ts
admit(spec, options?): AdmissionDecision;
```

Defined in: [packages/core/src/orchestrator/admission.ts:443](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L443)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`AdmitSpec`](/api/@rulvar/core/interfaces/AdmitSpec.md) |
| `options?` | \{ `commitReserve?`: `boolean`; \} |
| `options.commitReserve?` | `boolean` |

#### Returns

[`AdmissionDecision`](/api/@rulvar/core/interfaces/AdmissionDecision.md)

***

### bindTermination()

```ts
bindTermination(account): void;
```

Defined in: [packages/core/src/orchestrator/admission.ts:327](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L327)

Binds the run's TerminationAccount (DEF-2; PlanRunner runs only):
from bind time on, every admitted spawn of any
origin debits one spawnUnit atomically with its decision entry, and
a declared ladder longer than the frozen kMax rejects with
ladder_exceeds_frozen. Non-PlanRunner runs never bind an account and
keep the engine lifetime cap semantics unchanged.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `account` | [`TerminationAccount`](/api/@rulvar/core/classes/TerminationAccount.md) |

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
        code: "lineage_exhausted" | "lineage_busy";
     };
   };
  statsBefore?: LineageStats;
};
```

Defined in: [packages/core/src/orchestrator/admission.ts:347](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L347)

The lineage half of admission (DEF-3): folds are
computed live STRICTLY BEFORE the carrying decision entry is appended;
the caller embeds the returned block in the entry and replay reads it
back byte-exact. Enforces the single-live-attempt invariant
(`lineage_busy`) and monotonic attempt consumption
(`lineage_exhausted`); never touches budget or structural limits.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | \{ `ancestry?`: `string`[]; `approach?`: `string`; `lineage?`: [`SpawnLineageOpt`](/api/@rulvar/core/interfaces/SpawnLineageOpt.md); `name`: `string`; `signature?`: `Partial`\&lt;[`ApproachSignatureInputs`](/api/@rulvar/core/interfaces/ApproachSignatureInputs.md)\&gt;; \} |
| `spec.ancestry?` | `string`[] |
| `spec.approach?` | `string` |
| `spec.lineage?` | [`SpawnLineageOpt`](/api/@rulvar/core/interfaces/SpawnLineageOpt.md) |
| `spec.name` | `string` |
| `spec.signature?` | `Partial`\&lt;[`ApproachSignatureInputs`](/api/@rulvar/core/interfaces/ApproachSignatureInputs.md)\&gt; |

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
        code: "lineage_exhausted" | "lineage_busy";
     };
   };
  statsBefore?: LineageStats;
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `decision` | \| \{ `kind`: `"ok"`; `lineage`: [`SpawnLineage`](/api/@rulvar/core/interfaces/SpawnLineage.md); \} \| \{ `kind`: `"reject"`; `reason`: \{ `code`: `"lineage_exhausted"` \| `"lineage_busy"`; \}; \} | [packages/core/src/orchestrator/admission.ts:354](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L354) |
| `statsBefore?` | [`LineageStats`](/api/@rulvar/core/interfaces/LineageStats.md) | [packages/core/src/orchestrator/admission.ts:357](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L357) |

***

### lineage()

```ts
lineage(): LineageIndex | undefined;
```

Defined in: [packages/core/src/orchestrator/admission.ts:307](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L307)

The lineage counter folds over the run journal (absorbed lazily).

#### Returns

[`LineageIndex`](/api/@rulvar/core/classes/LineageIndex.md) \| `undefined`

***

### projectedDispatchReserveUsd()

```ts
projectedDispatchReserveUsd(spec): number;
```

Defined in: [packages/core/src/orchestrator/admission.ts:438](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L438)

The reserve the DISPATCH layer will actually commit for this spec:
the estimate (or the flat default) clamped by the explicit child
budget when one exists, because only an explicit budget opens a
child-allowance account at dispatch; the childBudgetFraction cap
never materializes as an account and must not shrink the
projection. The token-count-priced estimate of ctx.agent is
unreachable here (async); a divergence there lands as a journaled
dispatch rejection instead of a strand.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | `Pick`\&lt;[`AdmitSpec`](/api/@rulvar/core/interfaces/AdmitSpec.md), `"estCostUsd"` \| `"budgetUsd"`\&gt; |

#### Returns

`number`

***

### recoverChild()

```ts
recoverChild(nodeKey): void;
```

Defined in: [packages/core/src/orchestrator/admission.ts:591](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L591)

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

Defined in: [packages/core/src/orchestrator/admission.ts:615](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L615)

Resume roll-forward for an admission whose decision entry exists but
whose child has NOT settled: re-applies the recorded reserve and
counters without re-evaluating any limit (replay never
re-evaluates admission; reserves are recovered, never
re-estimated).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `parentAccountScope` | `string` |
| `verdict` | [`AdmitVerdict`](/api/@rulvar/core/type-aliases/AdmitVerdict.md) |

#### Returns

`void`

***

### recoverSettled()

```ts
recoverSettled(parentAccountScope): void;
```

Defined in: [packages/core/src/orchestrator/admission.ts:602](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L602)

Resume roll-forward for a child that already SETTLED before the
resume: re-registers the counters (maxChildrenPerNode, the lifetime
cap, statsBefore fidelity) without committing any reserve; the spend
itself sits in the root ledger seed.

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

Defined in: [packages/core/src/orchestrator/admission.ts:415](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L415)

Registers a live lineage admit the moment its caller commits to
appending the decision entry, closing the single-live-attempt window
until the journal absorbs the entry (DEF-3).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `logicalTaskId` | `string` |

#### Returns

`void`
