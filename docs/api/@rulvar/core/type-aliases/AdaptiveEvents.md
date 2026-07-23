[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AdaptiveEvents

# Type Alias: AdaptiveEvents

```ts
type AdaptiveEvents = 
  | {
  applied: number;
  dropped: number;
  entryRef: number;
  planHash: string;
  revisionUnitsRemaining: number;
  type: "plan:revised";
}
  | {
  logicalTaskId: string;
  nodeId: string;
  type: "node:parked";
}
  | {
  logicalTaskId: string;
  nodeId: string;
  type: "node:cancelled";
}
  | {
  donorRef: number;
  logicalTaskId: string;
  nodeId: string;
  reclaimedUsd: number;
  type: "node:linked";
}
  | {
  coversToOrdinal: number;
  digestSeq: number;
  planHash: string;
  renderSize: number;
  type: "orchestrator:woke";
}
  | {
  atCap: boolean;
  capUsd?: number;
  finalizeReserveUsd?: number;
  orchestratorCapUsd?: number;
  orchestratorShare?: number;
  orchestratorSpentUsd?: number;
  runCeilingUsd?: number;
  runSpentUsd?: number;
  softWarning?: boolean;
  spentUsd?: number;
  type: "orchestrator:budget";
}
  | {
  costToDateUsd: number;
  entryRef: number;
  kind: "scope_bigger" | "scope_different" | "blocked_with_evidence";
  logicalTaskId: string;
  type: "escalation:raised";
}
  | {
  by: ResolutionBy;
  countsAgainstLimit: boolean;
  decision: "retry" | "decompose" | "cancel" | "accept";
  entryRef: number;
  type: "escalation:decided";
}
  | {
  agentType: string;
  entryRef: number;
  logicalTaskId: string;
  spawnUnitsAfter?: number;
  type: "spawn:admitted";
  verdict: "admit" | "reuse_full" | "admit_graft";
}
  | {
  agentType: string;
  code: string;
  entryRef?: number;
  logicalTaskId?: string;
  type: "spawn:rejected";
}
  | {
  entryRef: number;
  gate: "mechanical" | "judge" | "spot-check";
  logicalTaskId: string;
  rung: number;
  type: "verify:failed";
}
  | {
  entryRef: number;
  op:   | "brief_set"
     | "fact_add"
     | "fact_supersede"
     | "lesson_add"
     | "observation_add";
  type: "ledger:op";
}
  | {
  logicalTaskId: string;
  stallStreak: number;
  type: "stall:detected";
}
  | {
  limit: number;
  oscillationCount: number;
  spawnKeyHash: string;
  type: "guard:oscillation";
}
  | {
  by: ResolutionBy;
  entryRef: number;
  targetRef: number;
  type: "resolution:applied";
}
  | {
  entryRef: number;
  reason: "already_resolved" | "target_abandoned";
  supersededBy: number;
  targetRef: number;
  type: "resolution:superseded";
}
  | {
  counter: string;
  entryRef: number;
  phi: number;
  remaining: number;
  type: "termination:debit";
}
  | {
  code: string;
  counter: string;
  entryRef: number;
  type: "termination:denied";
}
  | {
  field: string;
  frozenValue: Json;
  liveValue: Json;
  type: "termination:config-drift";
}
  | {
  code: "HASH_VERSION_TOO_OLD" | "HASH_VERSION_TOO_NEW";
  found: number;
  type: "journal:compat";
  window: [number, number];
};
```

Defined in: [packages/core/src/l0/events.ts:252](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L252)

Adaptive orchestration, resolutions, and
accounting: emitted only by runs where the corresponding machinery is
active (applicability per mode:
https://docs.rulvar.com/guide/adaptive-orchestration). The types land as
one closed catalog with M7-T03; emitters arrive with their tasks.

## Union Members

### Type Literal

```ts
{
  applied: number;
  dropped: number;
  entryRef: number;
  planHash: string;
  revisionUnitsRemaining: number;
  type: "plan:revised";
}
```

***

### Type Literal

```ts
{
  logicalTaskId: string;
  nodeId: string;
  type: "node:parked";
}
```

***

### Type Literal

```ts
{
  logicalTaskId: string;
  nodeId: string;
  type: "node:cancelled";
}
```

***

### Type Literal

```ts
{
  donorRef: number;
  logicalTaskId: string;
  nodeId: string;
  reclaimedUsd: number;
  type: "node:linked";
}
```

***

### Type Literal

```ts
{
  coversToOrdinal: number;
  digestSeq: number;
  planHash: string;
  renderSize: number;
  type: "orchestrator:woke";
}
```

***

### Type Literal

```ts
{
  atCap: boolean;
  capUsd?: number;
  finalizeReserveUsd?: number;
  orchestratorCapUsd?: number;
  orchestratorShare?: number;
  orchestratorSpentUsd?: number;
  runCeilingUsd?: number;
  runSpentUsd?: number;
  softWarning?: boolean;
  spentUsd?: number;
  type: "orchestrator:budget";
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `atCap` | `boolean` | - | [packages/core/src/l0/events.ts:285](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L285) |
| `capUsd?` | `number` | - | [packages/core/src/l0/events.ts:287](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L287) |
| `finalizeReserveUsd?` | `number` | - | [packages/core/src/l0/events.ts:288](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L288) |
| `orchestratorCapUsd?` | `number` | - | [packages/core/src/l0/events.ts:292](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L292) |
| `orchestratorShare?` | `number` | - | [packages/core/src/l0/events.ts:293](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L293) |
| `orchestratorSpentUsd?` | `number` | - | [packages/core/src/l0/events.ts:291](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L291) |
| `runCeilingUsd?` | `number` | - | [packages/core/src/l0/events.ts:290](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L290) |
| `runSpentUsd?` | `number` | - | [packages/core/src/l0/events.ts:289](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L289) |
| `softWarning?` | `boolean` | - | [packages/core/src/l0/events.ts:294](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L294) |
| `spentUsd?` | `number` | - | [packages/core/src/l0/events.ts:286](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L286) |
| `type` | `"orchestrator:budget"` | Two emitted shapes share the discriminant: the cap-freeze form carries { atCap: true, spentUsd, capUsd, finalizeReserveUsd }, and the per-wake digest form carries atCap plus the passive WakeBudgetBlock fields (runSpentUsd .. softWarning). | [packages/core/src/l0/events.ts:284](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L284) |

***

### Type Literal

```ts
{
  costToDateUsd: number;
  entryRef: number;
  kind: "scope_bigger" | "scope_different" | "blocked_with_evidence";
  logicalTaskId: string;
  type: "escalation:raised";
}
```

***

### Type Literal

```ts
{
  by: ResolutionBy;
  countsAgainstLimit: boolean;
  decision: "retry" | "decompose" | "cancel" | "accept";
  entryRef: number;
  type: "escalation:decided";
}
```

***

### Type Literal

```ts
{
  agentType: string;
  entryRef: number;
  logicalTaskId: string;
  spawnUnitsAfter?: number;
  type: "spawn:admitted";
  verdict: "admit" | "reuse_full" | "admit_graft";
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:315](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L315) |
| `entryRef` | `number` | - | [packages/core/src/l0/events.ts:312](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L312) |
| `logicalTaskId` | `string` | - | [packages/core/src/l0/events.ts:316](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L316) |
| `spawnUnitsAfter?` | `number` | Spawn-unit balance after the budget-layer debit. Present on budget-layer admissions (the orchestrator spawn tools and ctx.workflow children); absent on lineage-layer admissions (ctx.agent roots), whose spawn-unit debit rides the dispatch itself (v1.22.0 review P2-5). | [packages/core/src/l0/events.ts:324](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L324) |
| `type` | `"spawn:admitted"` | - | [packages/core/src/l0/events.ts:311](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L311) |
| `verdict` | `"admit"` \| `"reuse_full"` \| `"admit_graft"` | The admitting arms of the unified AdmitVerdict union. | [packages/core/src/l0/events.ts:314](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L314) |

***

### Type Literal

```ts
{
  agentType: string;
  code: string;
  entryRef?: number;
  logicalTaskId?: string;
  type: "spawn:rejected";
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:335](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L335) |
| `code` | `string` | - | [packages/core/src/l0/events.ts:334](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L334) |
| `entryRef?` | `number` | The journaled admission decision entry; absent for the pre-admission config gates (orchestrate maxSpawns), which reject before anything is journaled. | [packages/core/src/l0/events.ts:333](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L333) |
| `logicalTaskId?` | `string` | - | [packages/core/src/l0/events.ts:336](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L336) |
| `type` | `"spawn:rejected"` | - | [packages/core/src/l0/events.ts:327](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L327) |

***

### Type Literal

```ts
{
  entryRef: number;
  gate: "mechanical" | "judge" | "spot-check";
  logicalTaskId: string;
  rung: number;
  type: "verify:failed";
}
```

***

### Type Literal

```ts
{
  entryRef: number;
  op:   | "brief_set"
     | "fact_add"
     | "fact_supersede"
     | "lesson_add"
     | "observation_add";
  type: "ledger:op";
}
```

***

### Type Literal

```ts
{
  logicalTaskId: string;
  stallStreak: number;
  type: "stall:detected";
}
```

***

### Type Literal

```ts
{
  limit: number;
  oscillationCount: number;
  spawnKeyHash: string;
  type: "guard:oscillation";
}
```

***

### Type Literal

```ts
{
  by: ResolutionBy;
  entryRef: number;
  targetRef: number;
  type: "resolution:applied";
}
```

***

### Type Literal

```ts
{
  entryRef: number;
  reason: "already_resolved" | "target_abandoned";
  supersededBy: number;
  targetRef: number;
  type: "resolution:superseded";
}
```

***

### Type Literal

```ts
{
  counter: string;
  entryRef: number;
  phi: number;
  remaining: number;
  type: "termination:debit";
}
```

***

### Type Literal

```ts
{
  code: string;
  counter: string;
  entryRef: number;
  type: "termination:denied";
}
```

***

### Type Literal

```ts
{
  field: string;
  frozenValue: Json;
  liveValue: Json;
  type: "termination:config-drift";
}
```

***

### Type Literal

```ts
{
  code: "HASH_VERSION_TOO_OLD" | "HASH_VERSION_TOO_NEW";
  found: number;
  type: "journal:compat";
  window: [number, number];
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `code` | `"HASH_VERSION_TOO_OLD"` \| `"HASH_VERSION_TOO_NEW"` | - | [packages/core/src/l0/events.ts:371](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L371) |
| `found` | `number` | - | [packages/core/src/l0/events.ts:372](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L372) |
| `type` | `"journal:compat"` | Declared for hosts; not emitted today. The compatibility scan runs strictly before a run's event stream exists, so the refusal travels only as the typed JournalCompatibilityError (which carries the same fields). | [packages/core/src/l0/events.ts:370](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L370) |
| `window` | \[`number`, `number`\] | - | [packages/core/src/l0/events.ts:373](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L373) |
