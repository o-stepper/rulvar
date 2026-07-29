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

Defined in: [packages/core/src/l0/events.ts:187](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L187)

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
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:192](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L192) |
| `invocation` | `number` | 1-based activation ordinal within the span, unique per activation (a summarize that fires three times gets three pairs). Key phases by (spanId, invocation). | [packages/core/src/l0/events.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L203) |
| `label?` | `string` | - | [packages/core/src/l0/events.ts:193](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L193) |
| `model` | `string` | The model the activation resolved to (fallbacks may serve another; the end event reports the server). | [packages/core/src/l0/events.ts:197](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L197) |
| `role` | `string` | The invocation role this phase activation runs as. | [packages/core/src/l0/events.ts:195](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L195) |
| `type` | `"agent:phase:start"` | - | [packages/core/src/l0/events.ts:191](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L191) |

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
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L207) |
| `costBasis?` | [`CostBasis`](/api/@rulvar/core/type-aliases/CostBasis.md) | The fold behind `costUsd` (RV702). Live phase deltas are always per-call (every slice a live activation adds is backed by a recorded provider call); a replayed pair says 'aggregate-estimate' exactly when its model's records do not cover its usage. Absent on streams recorded before RV702, which priced the aggregate. | [packages/core/src/l0/events.ts:230](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L230) |
| `costUsd` | `number` | That usage priced at each serving model's own rate. | [packages/core/src/l0/events.ts:222](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L222) |
| `durationMs` | `number` | Wall-clock activation duration. Live telemetry only: replayed phase pairs (reconstructed from the terminal entry's usage slices) carry 0. | [packages/core/src/l0/events.ts:218](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L218) |
| `invocation` | `number` | - | [packages/core/src/l0/events.ts:212](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L212) |
| `label?` | `string` | - | [packages/core/src/l0/events.ts:208](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L208) |
| `model` | `string` | The model that actually served the activation's last attempt. | [packages/core/src/l0/events.ts:211](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L211) |
| `outcome` | `"ok"` \| `"error"` | - | [packages/core/src/l0/events.ts:231](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L231) |
| `retries?` | `number` | Transport retries inside this activation. Present only when greater than zero; live telemetry only (absent on replay). | [packages/core/src/l0/events.ts:236](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L236) |
| `role` | `string` | - | [packages/core/src/l0/events.ts:209](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L209) |
| `type` | `"agent:phase:end"` | - | [packages/core/src/l0/events.ts:206](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L206) |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | The usage this activation added to its (role, model) slices. | [packages/core/src/l0/events.ts:220](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L220) |

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
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:240](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L240) |
| `costBasis?` | [`CostBasis`](/api/@rulvar/core/type-aliases/CostBasis.md) | The fold behind `costUsd` (RV702): 'per-call' when every usage slice of the invocation (restored included) is covered by per-request records priced individually, the settled fold's own basis; 'aggregate-estimate' when it is not (the aggregate number is kept so restored spend is never silently dropped, and labeled so it is never mistaken for the per-request fold). Absent on streams recorded before RV702, which priced the aggregate. | [packages/core/src/l0/events.ts:254](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L254) |
| `costUsd` | `number` | - | [packages/core/src/l0/events.ts:244](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L244) |
| `entryRef` | `number` | - | [packages/core/src/l0/events.ts:255](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L255) |
| `exploration?` | [`ExplorationSummary`](/api/@rulvar/core/interfaces/ExplorationSummary.md) | The exploration guard counters (RV-210). Present live whenever any exploration guard limit was configured for the invocation; on replay present only when the guard abort journaled it in the terminal error payload. | [packages/core/src/l0/events.ts:277](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L277) |
| `label?` | `string` | - | [packages/core/src/l0/events.ts:241](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L241) |
| `retryCount?` | `number` | Total transport retries across the span's activations. Present only when greater than zero; live telemetry only, never journaled, so a replayed agent:end omits it (absent means "zero or unknown"). | [packages/core/src/l0/events.ts:270](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L270) |
| `status` | `string` | - | [packages/core/src/l0/events.ts:242](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L242) |
| `toolBudget?` | [`ToolBudgetSummary`](/api/@rulvar/core/interfaces/ToolBudgetSummary.md) | The tool budget pressure snapshot (RV304). Present live whenever a tool budget limiter or the extension was configured; live telemetry only, absent on replay. | [packages/core/src/l0/events.ts:283](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L283) |
| `type` | `"agent:end"` | - | [packages/core/src/l0/events.ts:239](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L239) |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/l0/events.ts:243](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L243) |
| `usageApprox?` | `boolean` | Present and true when this agent's usage is approximate rather than reported by the provider (the turn was cut by a transport failure, a ceiling that severed the stream, or an abort). Absent means the provider reported the usage exactly. Mirrors the terminal journal entry's usageApprox. | [packages/core/src/l0/events.ts:263](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L263) |

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
