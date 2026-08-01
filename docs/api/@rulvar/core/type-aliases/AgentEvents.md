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

Defined in: [packages/core/src/l0/events.ts:240](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L240)

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
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:245](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L245) |
| `invocation` | `number` | 1-based activation ordinal within the span, unique per activation (a summarize that fires three times gets three pairs). Key phases by (spanId, invocation). | [packages/core/src/l0/events.ts:256](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L256) |
| `label?` | `string` | - | [packages/core/src/l0/events.ts:246](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L246) |
| `model` | `string` | The model the activation resolved to (fallbacks may serve another; the end event reports the server). | [packages/core/src/l0/events.ts:250](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L250) |
| `role` | `string` | The invocation role this phase activation runs as. | [packages/core/src/l0/events.ts:248](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L248) |
| `type` | `"agent:phase:start"` | - | [packages/core/src/l0/events.ts:244](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L244) |

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
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:260](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L260) |
| `costBasis?` | [`CostBasis`](/api/@rulvar/core/type-aliases/CostBasis.md) | The fold behind `costUsd` (RV702). Live phase deltas are always per-call (every slice a live activation adds is backed by a recorded provider call); a replayed pair says 'aggregate-estimate' exactly when its model's records do not cover its usage. Absent on streams recorded before RV702, which priced the aggregate. | [packages/core/src/l0/events.ts:283](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L283) |
| `costUsd` | `number` | That usage priced at each serving model's own rate. | [packages/core/src/l0/events.ts:275](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L275) |
| `durationMs` | `number` | Wall-clock activation duration. Live telemetry only: replayed phase pairs (reconstructed from the terminal entry's usage slices) carry 0. | [packages/core/src/l0/events.ts:271](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L271) |
| `invocation` | `number` | - | [packages/core/src/l0/events.ts:265](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L265) |
| `label?` | `string` | - | [packages/core/src/l0/events.ts:261](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L261) |
| `model` | `string` | The model that actually served the activation's last attempt. | [packages/core/src/l0/events.ts:264](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L264) |
| `outcome` | `"ok"` \| `"error"` | - | [packages/core/src/l0/events.ts:284](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L284) |
| `retries?` | `number` | Transport retries inside this activation. Present only when greater than zero; live telemetry only (absent on replay). | [packages/core/src/l0/events.ts:289](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L289) |
| `role` | `string` | - | [packages/core/src/l0/events.ts:262](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L262) |
| `type` | `"agent:phase:end"` | - | [packages/core/src/l0/events.ts:259](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L259) |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | The usage this activation added to its (role, model) slices. | [packages/core/src/l0/events.ts:273](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L273) |

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
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:293](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L293) |
| `costBasis?` | [`CostBasis`](/api/@rulvar/core/type-aliases/CostBasis.md) | The fold behind `costUsd` (RV702): 'per-call' when every usage slice of the invocation (restored included) is covered by per-request records priced individually, the settled fold's own basis; 'aggregate-estimate' when it is not (the aggregate number is kept so restored spend is never silently dropped, and labeled so it is never mistaken for the per-request fold). Absent on streams recorded before RV702, which priced the aggregate. | [packages/core/src/l0/events.ts:307](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L307) |
| `costUsd` | `number` | - | [packages/core/src/l0/events.ts:297](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L297) |
| `entryRef` | `number` | - | [packages/core/src/l0/events.ts:308](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L308) |
| `exploration?` | [`ExplorationSummary`](/api/@rulvar/core/interfaces/ExplorationSummary.md) | The exploration guard counters (RV-210). Present live whenever any exploration guard limit was configured for the invocation; on replay present only when the guard abort journaled it in the terminal error payload. | [packages/core/src/l0/events.ts:330](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L330) |
| `label?` | `string` | - | [packages/core/src/l0/events.ts:294](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L294) |
| `retryCount?` | `number` | Total transport retries across the span's activations. Present only when greater than zero; live telemetry only, never journaled, so a replayed agent:end omits it (absent means "zero or unknown"). | [packages/core/src/l0/events.ts:323](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L323) |
| `status` | `string` | - | [packages/core/src/l0/events.ts:295](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L295) |
| `toolBudget?` | [`ToolBudgetSummary`](/api/@rulvar/core/interfaces/ToolBudgetSummary.md) | The tool budget pressure snapshot (RV304). Present live whenever a tool budget limiter or the extension was configured; live telemetry only, absent on replay. | [packages/core/src/l0/events.ts:336](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L336) |
| `type` | `"agent:end"` | - | [packages/core/src/l0/events.ts:292](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L292) |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/l0/events.ts:296](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L296) |
| `usageApprox?` | `boolean` | Present and true when this agent's usage is approximate rather than reported by the provider (the turn was cut by a transport failure, a ceiling that severed the stream, or an abort). Absent means the provider reported the usage exactly. Mirrors the terminal journal entry's usageApprox. | [packages/core/src/l0/events.ts:316](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L316) |

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
