[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AdaptiveEvents

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
  effectiveCapUsd: number;
  entryRef: number;
  frozen: boolean;
  reserveUsedUsd: number;
  spentUsd: number;
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
  entryRef: number;
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

Defined in: `packages/core/dist/index.d.ts`

Adaptive orchestration, resolutions, and
accounting: emitted only by runs where the corresponding machinery is
active (applicability per mode:
https://docs.rulvar.com/guide/adaptive-orchestration). The types land as
one closed catalog with M7-T03; emitters arrive with their tasks.
