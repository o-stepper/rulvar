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

Defined in: [packages/core/src/l0/events.ts:161](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L161)

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
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L166) |
| `invocation` | `number` | 1-based activation ordinal within the span, unique per activation (a summarize that fires three times gets three pairs). Key phases by (spanId, invocation). | [packages/core/src/l0/events.ts:177](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L177) |
| `label?` | `string` | - | [packages/core/src/l0/events.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L167) |
| `model` | `string` | The model the activation resolved to (fallbacks may serve another; the end event reports the server). | [packages/core/src/l0/events.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L171) |
| `role` | `string` | The invocation role this phase activation runs as. | [packages/core/src/l0/events.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L169) |
| `type` | `"agent:phase:start"` | - | [packages/core/src/l0/events.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L165) |

***

### Type Literal

```ts
{
  agentType: string;
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
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L181) |
| `costUsd` | `number` | That usage priced at each serving model's own rate. | [packages/core/src/l0/events.ts:196](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L196) |
| `durationMs` | `number` | Wall-clock activation duration. Live telemetry only: replayed phase pairs (reconstructed from the terminal entry's usage slices) carry 0. | [packages/core/src/l0/events.ts:192](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L192) |
| `invocation` | `number` | - | [packages/core/src/l0/events.ts:186](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L186) |
| `label?` | `string` | - | [packages/core/src/l0/events.ts:182](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L182) |
| `model` | `string` | The model that actually served the activation's last attempt. | [packages/core/src/l0/events.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L185) |
| `outcome` | `"ok"` \| `"error"` | - | [packages/core/src/l0/events.ts:197](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L197) |
| `retries?` | `number` | Transport retries inside this activation. Present only when greater than zero; live telemetry only (absent on replay). | [packages/core/src/l0/events.ts:202](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L202) |
| `role` | `string` | - | [packages/core/src/l0/events.ts:183](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L183) |
| `type` | `"agent:phase:end"` | - | [packages/core/src/l0/events.ts:180](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L180) |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | The usage this activation added to its (role, model) slices. | [packages/core/src/l0/events.ts:194](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L194) |

***

### Type Literal

```ts
{
  agentType: string;
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
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:206](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L206) |
| `costUsd` | `number` | - | [packages/core/src/l0/events.ts:210](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L210) |
| `entryRef` | `number` | - | [packages/core/src/l0/events.ts:211](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L211) |
| `exploration?` | [`ExplorationSummary`](/api/@rulvar/core/interfaces/ExplorationSummary.md) | The exploration guard counters (RV-210). Present live whenever any exploration guard limit was configured for the invocation; on replay present only when the guard abort journaled it in the terminal error payload. | [packages/core/src/l0/events.ts:233](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L233) |
| `label?` | `string` | - | [packages/core/src/l0/events.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L207) |
| `retryCount?` | `number` | Total transport retries across the span's activations. Present only when greater than zero; live telemetry only, never journaled, so a replayed agent:end omits it (absent means "zero or unknown"). | [packages/core/src/l0/events.ts:226](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L226) |
| `status` | `string` | - | [packages/core/src/l0/events.ts:208](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L208) |
| `toolBudget?` | [`ToolBudgetSummary`](/api/@rulvar/core/interfaces/ToolBudgetSummary.md) | The tool budget pressure snapshot (RV304). Present live whenever a tool budget limiter or the extension was configured; live telemetry only, absent on replay. | [packages/core/src/l0/events.ts:239](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L239) |
| `type` | `"agent:end"` | - | [packages/core/src/l0/events.ts:205](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L205) |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/l0/events.ts:209](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L209) |
| `usageApprox?` | `boolean` | Present and true when this agent's usage is approximate rather than reported by the provider (the turn was cut by a transport failure, a ceiling that severed the stream, or an abort). Absent means the provider reported the usage exactly. Mirrors the terminal journal entry's usageApprox. | [packages/core/src/l0/events.ts:219](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L219) |

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
