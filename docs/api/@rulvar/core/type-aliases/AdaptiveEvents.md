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
  spawnUnitsAfter: number;
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

Defined in: [packages/core/src/l0/events.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L89)

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
| `atCap` | `boolean` | - | [packages/core/src/l0/events.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L122) |
| `capUsd?` | `number` | - | [packages/core/src/l0/events.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L124) |
| `finalizeReserveUsd?` | `number` | - | [packages/core/src/l0/events.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L125) |
| `orchestratorCapUsd?` | `number` | - | [packages/core/src/l0/events.ts:129](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L129) |
| `orchestratorShare?` | `number` | - | [packages/core/src/l0/events.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L130) |
| `orchestratorSpentUsd?` | `number` | - | [packages/core/src/l0/events.ts:128](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L128) |
| `runCeilingUsd?` | `number` | - | [packages/core/src/l0/events.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L127) |
| `runSpentUsd?` | `number` | - | [packages/core/src/l0/events.ts:126](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L126) |
| `softWarning?` | `boolean` | - | [packages/core/src/l0/events.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L131) |
| `spentUsd?` | `number` | - | [packages/core/src/l0/events.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L123) |
| `type` | `"orchestrator:budget"` | Two emitted shapes share the discriminant: the cap-freeze form carries { atCap: true, spentUsd, capUsd, finalizeReserveUsd }, and the per-wake digest form carries atCap plus the passive WakeBudgetBlock fields (runSpentUsd .. softWarning). | [packages/core/src/l0/events.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L121) |

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
  spawnUnitsAfter: number;
  type: "spawn:admitted";
  verdict: "admit" | "reuse_full" | "admit_graft";
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L152) |
| `entryRef` | `number` | - | [packages/core/src/l0/events.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L149) |
| `logicalTaskId` | `string` | - | [packages/core/src/l0/events.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L153) |
| `spawnUnitsAfter` | `number` | - | [packages/core/src/l0/events.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L154) |
| `type` | `"spawn:admitted"` | - | [packages/core/src/l0/events.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L148) |
| `verdict` | `"admit"` \| `"reuse_full"` \| `"admit_graft"` | The admitting arms of the unified AdmitVerdict union. | [packages/core/src/l0/events.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L151) |

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
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L165) |
| `code` | `string` | - | [packages/core/src/l0/events.ts:164](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L164) |
| `entryRef?` | `number` | The journaled admission decision entry; absent for the pre-admission config gates (orchestrate maxSpawns), which reject before anything is journaled. | [packages/core/src/l0/events.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L163) |
| `logicalTaskId?` | `string` | - | [packages/core/src/l0/events.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L166) |
| `type` | `"spawn:rejected"` | - | [packages/core/src/l0/events.ts:157](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L157) |

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
| `code` | `"HASH_VERSION_TOO_OLD"` \| `"HASH_VERSION_TOO_NEW"` | - | [packages/core/src/l0/events.ts:201](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L201) |
| `found` | `number` | - | [packages/core/src/l0/events.ts:202](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L202) |
| `type` | `"journal:compat"` | Declared for hosts; not emitted today. The compatibility scan runs strictly before a run's event stream exists, so the refusal travels only as the typed JournalCompatibilityError (which carries the same fields). | [packages/core/src/l0/events.ts:200](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L200) |
| `window` | \[`number`, `number`\] | - | [packages/core/src/l0/events.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L203) |
