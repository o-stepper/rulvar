[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AgentEvents

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
  attempt: number;
  maxAttempts: number;
  type: "agent:schema-retry";
}
  | {
  delta: string;
  type: "agent:stream";
};
```

Defined in: [packages/core/src/l0/events.ts:238](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L238)

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
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:243](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L243) |
| `invocation` | `number` | 1-based activation ordinal within the span, unique per activation (a summarize that fires three times gets three pairs). Key phases by (spanId, invocation). | [packages/core/src/l0/events.ts:254](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L254) |
| `label?` | `string` | - | [packages/core/src/l0/events.ts:244](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L244) |
| `model` | `string` | The model the activation resolved to (fallbacks may serve another; the end event reports the server). | [packages/core/src/l0/events.ts:248](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L248) |
| `role` | `string` | The invocation role this phase activation runs as. | [packages/core/src/l0/events.ts:246](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L246) |
| `type` | `"agent:phase:start"` | - | [packages/core/src/l0/events.ts:242](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L242) |

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
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:258](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L258) |
| `costBasis?` | [`CostBasis`](/api/@rulvar/core/type-aliases/CostBasis.md) | The fold behind `costUsd` (RV702). Live phase deltas are always per-call (every slice a live activation adds is backed by a recorded provider call); a replayed pair says 'aggregate-estimate' exactly when its model's records do not cover its usage. Absent on streams recorded before RV702, which priced the aggregate. | [packages/core/src/l0/events.ts:281](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L281) |
| `costUsd` | `number` | That usage priced at each serving model's own rate. | [packages/core/src/l0/events.ts:273](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L273) |
| `durationMs` | `number` | Wall-clock activation duration. Live telemetry only: replayed phase pairs (reconstructed from the terminal entry's usage slices) carry 0. | [packages/core/src/l0/events.ts:269](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L269) |
| `invocation` | `number` | - | [packages/core/src/l0/events.ts:263](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L263) |
| `label?` | `string` | - | [packages/core/src/l0/events.ts:259](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L259) |
| `model` | `string` | The model that actually served the activation's last attempt. | [packages/core/src/l0/events.ts:262](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L262) |
| `outcome` | `"ok"` \| `"error"` | - | [packages/core/src/l0/events.ts:282](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L282) |
| `retries?` | `number` | Transport retries inside this activation. Present only when greater than zero; live telemetry only (absent on replay). | [packages/core/src/l0/events.ts:287](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L287) |
| `role` | `string` | - | [packages/core/src/l0/events.ts:260](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L260) |
| `type` | `"agent:phase:end"` | - | [packages/core/src/l0/events.ts:257](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L257) |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | The usage this activation added to its (role, model) slices. | [packages/core/src/l0/events.ts:271](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L271) |

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
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:291](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L291) |
| `costBasis?` | [`CostBasis`](/api/@rulvar/core/type-aliases/CostBasis.md) | The fold behind `costUsd` (RV702): 'per-call' when every usage slice of the invocation (restored included) is covered by per-request records priced individually, the settled fold's own basis; 'aggregate-estimate' when it is not (the aggregate number is kept so restored spend is never silently dropped, and labeled so it is never mistaken for the per-request fold). Absent on streams recorded before RV702, which priced the aggregate. | [packages/core/src/l0/events.ts:305](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L305) |
| `costUsd` | `number` | - | [packages/core/src/l0/events.ts:295](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L295) |
| `entryRef` | `number` | - | [packages/core/src/l0/events.ts:306](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L306) |
| `exploration?` | [`ExplorationSummary`](/api/@rulvar/core/interfaces/ExplorationSummary.md) | The exploration guard counters (RV-210). Present live whenever any exploration guard limit was configured for the invocation; on replay present only when the guard abort journaled it in the terminal error payload. | [packages/core/src/l0/events.ts:328](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L328) |
| `label?` | `string` | - | [packages/core/src/l0/events.ts:292](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L292) |
| `retryCount?` | `number` | Total transport retries across the span's activations. Present only when greater than zero; live telemetry only, never journaled, so a replayed agent:end omits it (absent means "zero or unknown"). | [packages/core/src/l0/events.ts:321](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L321) |
| `status` | `string` | - | [packages/core/src/l0/events.ts:293](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L293) |
| `toolBudget?` | [`ToolBudgetSummary`](/api/@rulvar/core/interfaces/ToolBudgetSummary.md) | The tool budget pressure snapshot (RV304). Present live whenever a tool budget limiter or the extension was configured; live telemetry only, absent on replay. | [packages/core/src/l0/events.ts:334](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L334) |
| `type` | `"agent:end"` | - | [packages/core/src/l0/events.ts:290](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L290) |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/l0/events.ts:294](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L294) |
| `usageApprox?` | `boolean` | Present and true when this agent's usage is approximate rather than reported by the provider (the turn was cut by a transport failure, a ceiling that severed the stream, or an abort). Absent means the provider reported the usage exactly. Mirrors the terminal journal entry's usageApprox. | [packages/core/src/l0/events.ts:314](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L314) |

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
  attempt: number;
  maxAttempts: number;
  type: "agent:schema-retry";
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

Emitted only when the call opts into streaming; never journaled, never re-emitted.
