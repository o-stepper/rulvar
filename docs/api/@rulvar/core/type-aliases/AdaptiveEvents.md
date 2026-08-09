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
  childStatusCounts: Record<string, number>;
  completion: "complete" | "partial" | "rejected";
  minSpawnedChildren?: number;
  spawnedChildren?: number;
  type: "orchestrator:acceptance";
  verdict: "accepted" | "rejected";
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

Defined in: [packages/core/src/l0/events.ts:558](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L558)

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
| `atCap` | `boolean` | - | [packages/core/src/l0/events.ts:591](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L591) |
| `capUsd?` | `number` | - | [packages/core/src/l0/events.ts:593](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L593) |
| `finalizeReserveUsd?` | `number` | - | [packages/core/src/l0/events.ts:594](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L594) |
| `orchestratorCapUsd?` | `number` | - | [packages/core/src/l0/events.ts:598](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L598) |
| `orchestratorShare?` | `number` | - | [packages/core/src/l0/events.ts:599](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L599) |
| `orchestratorSpentUsd?` | `number` | - | [packages/core/src/l0/events.ts:597](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L597) |
| `runCeilingUsd?` | `number` | - | [packages/core/src/l0/events.ts:596](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L596) |
| `runSpentUsd?` | `number` | - | [packages/core/src/l0/events.ts:595](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L595) |
| `softWarning?` | `boolean` | - | [packages/core/src/l0/events.ts:600](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L600) |
| `spentUsd?` | `number` | - | [packages/core/src/l0/events.ts:592](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L592) |
| `type` | `"orchestrator:budget"` | Two emitted shapes share the discriminant: the cap-freeze form carries { atCap: true, spentUsd, capUsd, finalizeReserveUsd }, and the per-wake digest form carries atCap plus the passive WakeBudgetBlock fields (runSpentUsd .. softWarning). | [packages/core/src/l0/events.ts:590](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L590) |

***

### Type Literal

```ts
{
  childStatusCounts: Record<string, number>;
  completion: "complete" | "partial" | "rejected";
  minSpawnedChildren?: number;
  spawnedChildren?: number;
  type: "orchestrator:acceptance";
  verdict: "accepted" | "rejected";
}
```

The acceptance verdict as its own event (RV1906): the four-role
benchmark's primary run showed a root `agent:end` with status ok
followed by a `run:end` error, semantically consistent (the loop
finished; the policy rejected the roster) but self-explanatory to
nobody tailing the stream. The verdict now speaks between them,
fresh and on the resume roll-forward alike, carrying the policy
facts of the ONE journaled acceptance decision.

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
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:638](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L638) |
| `entryRef` | `number` | - | [packages/core/src/l0/events.ts:635](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L635) |
| `logicalTaskId` | `string` | - | [packages/core/src/l0/events.ts:639](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L639) |
| `spawnUnitsAfter?` | `number` | Spawn-unit balance after the budget-layer debit. Present on budget-layer admissions (the orchestrator spawn tools and ctx.workflow children); absent on lineage-layer admissions (ctx.agent roots), whose spawn-unit debit rides the dispatch itself (v1.22.0 review P2-5). | [packages/core/src/l0/events.ts:647](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L647) |
| `type` | `"spawn:admitted"` | - | [packages/core/src/l0/events.ts:634](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L634) |
| `verdict` | `"admit"` \| `"reuse_full"` \| `"admit_graft"` | The admitting arms of the unified AdmitVerdict union. | [packages/core/src/l0/events.ts:637](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L637) |

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
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:658](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L658) |
| `code` | `string` | - | [packages/core/src/l0/events.ts:657](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L657) |
| `entryRef?` | `number` | The journaled admission decision entry; absent for the pre-admission config gates (orchestrate maxSpawns), which reject before anything is journaled. | [packages/core/src/l0/events.ts:656](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L656) |
| `logicalTaskId?` | `string` | - | [packages/core/src/l0/events.ts:659](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L659) |
| `type` | `"spawn:rejected"` | - | [packages/core/src/l0/events.ts:650](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L650) |

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
| `code` | `"HASH_VERSION_TOO_OLD"` \| `"HASH_VERSION_TOO_NEW"` | - | [packages/core/src/l0/events.ts:694](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L694) |
| `found` | `number` | - | [packages/core/src/l0/events.ts:695](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L695) |
| `type` | `"journal:compat"` | Declared for hosts; not emitted today. The compatibility scan runs strictly before a run's event stream exists, so the refusal travels only as the typed JournalCompatibilityError (which carries the same fields). | [packages/core/src/l0/events.ts:693](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L693) |
| `window` | \[`number`, `number`\] | - | [packages/core/src/l0/events.ts:696](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L696) |
