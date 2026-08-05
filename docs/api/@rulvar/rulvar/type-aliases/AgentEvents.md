[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AgentEvents

# Type Alias: AgentEvents

```ts
type AgentEvents = 
  | {
  agentType: string;
  label?: string;
  type: "agent:queued";
}
  | {
  agentType: string;
  label?: string;
  model: string;
  role: string;
  type: "agent:start";
}
  | {
  agentType: string;
  invocation: number;
  label?: string;
  model: string;
  role: string;
  type: "agent:phase:start";
}
  | {
  agentType: string;
  costBasis?: CostBasis;
  costUsd: number;
  durationMs: number;
  invocation: number;
  label?: string;
  model: string;
  outcome: "ok" | "error";
  retries?: number;
  role: string;
  type: "agent:phase:end";
  usage: Usage;
}
  | {
  agentType: string;
  costBasis?: CostBasis;
  costUsd: number;
  entryRef: number;
  exploration?: ExplorationSummary;
  label?: string;
  retryCount?: number;
  status: string;
  toolBudget?: ToolBudgetSummary;
  type: "agent:end";
  usage: Usage;
  usageApprox?: boolean;
}
  | {
  agentType: string;
  error: WireError;
  label?: string;
  type: "agent:error";
  willRetry: boolean;
}
  | {
  agentType: string;
  label?: string;
  model?: string;
  reason?: string;
  retryAfterMs?: number;
  type: "quota:denied";
  willRetry: true;
}
  | {
  agentType: string;
  capUsd?: number;
  estimateUsd?: number;
  inFlightUsd?: number;
  label?: string;
  model?: string;
  spentUsd?: number;
  type: "budget:exposure-wait";
  willWait: boolean;
}
  | {
  agentType: string;
  attempt: number;
  maxAttempts: number;
  type: "agent:schema-retry";
}
  | {
  controlKind: "countTokens";
  inputTokens?: number;
  model: string;
  outcome: "ok" | "failed" | "denied";
  type: "control:wire";
}
  | {
  delta: string;
  type: "agent:stream";
};
```

Defined in: `packages/core/dist/index.d.ts`

Agent lifecycle. One logical agent dispatch emits EXACTLY ONE
`agent:start`/`agent:end` pair on its span (the start carries the
primary role), and each model invocation phase inside the span
(`loop`, then possibly `summarize` activations, `finalize`,
`extract`) emits its own `agent:phase:start`/`agent:phase:end` pair,
so durations, per-phase usage, and attempts are derivable without
heuristics (the RV-207 event-model contract; before it, every phase
emitted an unpaired extra `agent:start` and consumers pairing starts
with the single end computed the LAST phase's duration as the
agent's). `reduceInvocationTable` is the official reducer over this
vocabulary.

## Union Members

### Type Literal

```ts
{
  agentType: string;
  label?: string;
  type: "agent:queued";
}
```

***

### Type Literal

```ts
{
  agentType: string;
  label?: string;
  model: string;
  role: string;
  type: "agent:start";
}
```

***

### Type Literal

```ts
{
  agentType: string;
  invocation: number;
  label?: string;
  model: string;
  role: string;
  type: "agent:phase:start";
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `agentType` | `string` | - | `packages/core/dist/index.d.ts` |
| `invocation` | `number` | 1-based activation ordinal within the span, unique per activation (a summarize that fires three times gets three pairs). Key phases by (spanId, invocation). | `packages/core/dist/index.d.ts` |
| `label?` | `string` | - | `packages/core/dist/index.d.ts` |
| `model` | `string` | - | `packages/core/dist/index.d.ts` |
| `role` | `string` | - | `packages/core/dist/index.d.ts` |
| `type` | `"agent:phase:start"` | - | `packages/core/dist/index.d.ts` |

***

### Type Literal

```ts
{
  agentType: string;
  costBasis?: CostBasis;
  costUsd: number;
  durationMs: number;
  invocation: number;
  label?: string;
  model: string;
  outcome: "ok" | "error";
  retries?: number;
  role: string;
  type: "agent:phase:end";
  usage: Usage;
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `agentType` | `string` | - | `packages/core/dist/index.d.ts` |
| `costBasis?` | [`CostBasis`](/api/@rulvar/rulvar/type-aliases/CostBasis.md) | The fold behind `costUsd` (RV702). Live phase deltas are always per-call (every slice a live activation adds is backed by a recorded provider call); a replayed pair says 'aggregate-estimate' exactly when its model's records do not cover its usage. Absent on streams recorded before RV702, which priced the aggregate. | `packages/core/dist/index.d.ts` |
| `costUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| `durationMs` | `number` | Wall-clock activation duration. Live telemetry only: replayed phase pairs (reconstructed from the terminal entry's usage slices) carry 0. | `packages/core/dist/index.d.ts` |
| `invocation` | `number` | - | `packages/core/dist/index.d.ts` |
| `label?` | `string` | - | `packages/core/dist/index.d.ts` |
| `model` | `string` | - | `packages/core/dist/index.d.ts` |
| `outcome` | `"ok"` \| `"error"` | - | `packages/core/dist/index.d.ts` |
| `retries?` | `number` | Transport retries inside this activation. Present only when greater than zero; live telemetry only (absent on replay). | `packages/core/dist/index.d.ts` |
| `role` | `string` | - | `packages/core/dist/index.d.ts` |
| `type` | `"agent:phase:end"` | - | `packages/core/dist/index.d.ts` |
| `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) | - | `packages/core/dist/index.d.ts` |

***

### Type Literal

```ts
{
  agentType: string;
  costBasis?: CostBasis;
  costUsd: number;
  entryRef: number;
  exploration?: ExplorationSummary;
  label?: string;
  retryCount?: number;
  status: string;
  toolBudget?: ToolBudgetSummary;
  type: "agent:end";
  usage: Usage;
  usageApprox?: boolean;
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `agentType` | `string` | - | `packages/core/dist/index.d.ts` |
| `costBasis?` | [`CostBasis`](/api/@rulvar/rulvar/type-aliases/CostBasis.md) | The fold behind `costUsd` (RV702): 'per-call' when every usage slice of the invocation (restored included) is covered by per-request records priced individually, the settled fold's own basis; 'aggregate-estimate' when it is not (the aggregate number is kept so restored spend is never silently dropped, and labeled so it is never mistaken for the per-request fold). Absent on streams recorded before RV702, which priced the aggregate. | `packages/core/dist/index.d.ts` |
| `costUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| `entryRef` | `number` | - | `packages/core/dist/index.d.ts` |
| `exploration?` | [`ExplorationSummary`](/api/@rulvar/rulvar/interfaces/ExplorationSummary.md) | The exploration guard counters (RV-210). Present live whenever any exploration guard limit was configured for the invocation; on replay present only when the guard abort journaled it in the terminal error payload. | `packages/core/dist/index.d.ts` |
| `label?` | `string` | - | `packages/core/dist/index.d.ts` |
| `retryCount?` | `number` | Total transport retries across the span's activations. Present only when greater than zero; live telemetry only, never journaled, so a replayed agent:end omits it (absent means "zero or unknown"). | `packages/core/dist/index.d.ts` |
| `status` | `string` | - | `packages/core/dist/index.d.ts` |
| `toolBudget?` | [`ToolBudgetSummary`](/api/@rulvar/rulvar/interfaces/ToolBudgetSummary.md) | The tool budget pressure snapshot (RV304). Present live whenever a tool budget limiter or the extension was configured; live telemetry only, absent on replay. | `packages/core/dist/index.d.ts` |
| `type` | `"agent:end"` | - | `packages/core/dist/index.d.ts` |
| `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) | - | `packages/core/dist/index.d.ts` |
| `usageApprox?` | `boolean` | Present and true when this agent's usage is approximate rather than reported by the provider (the turn was cut by a transport failure, a ceiling that severed the stream, or an abort). Absent means the provider reported the usage exactly. Mirrors the terminal journal entry's usageApprox. | `packages/core/dist/index.d.ts` |

***

### Type Literal

```ts
{
  agentType: string;
  error: WireError;
  label?: string;
  type: "agent:error";
  willRetry: boolean;
}
```

***

### Type Literal

```ts
{
  agentType: string;
  label?: string;
  model?: string;
  reason?: string;
  retryAfterMs?: number;
  type: "quota:denied";
  willRetry: true;
}
```

***

### Type Literal

```ts
{
  agentType: string;
  capUsd?: number;
  estimateUsd?: number;
  inFlightUsd?: number;
  label?: string;
  model?: string;
  spentUsd?: number;
  type: "budget:exposure-wait";
  willWait: boolean;
}
```

***

### Type Literal

```ts
{
  agentType: string;
  attempt: number;
  maxAttempts: number;
  type: "agent:schema-retry";
}
```

***

### Type Literal

```ts
{
  controlKind: "countTokens";
  inputTokens?: number;
  model: string;
  outcome: "ok" | "failed" | "denied";
  type: "control:wire";
}
```

***

### Type Literal

```ts
{
  delta: string;
  type: "agent:stream";
}
```
