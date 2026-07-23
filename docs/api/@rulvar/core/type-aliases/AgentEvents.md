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
  label?: string;
  retryCount?: number;
  status: string;
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

Defined in: [packages/core/src/l0/events.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L65)

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
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L70) |
| `invocation` | `number` | 1-based activation ordinal within the span, unique per activation (a summarize that fires three times gets three pairs). Key phases by (spanId, invocation). | [packages/core/src/l0/events.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L81) |
| `label?` | `string` | - | [packages/core/src/l0/events.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L71) |
| `model` | `string` | The model the activation resolved to (fallbacks may serve another; the end event reports the server). | [packages/core/src/l0/events.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L75) |
| `role` | `string` | The invocation role this phase activation runs as. | [packages/core/src/l0/events.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L73) |
| `type` | `"agent:phase:start"` | - | [packages/core/src/l0/events.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L69) |

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
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L85) |
| `costUsd` | `number` | That usage priced at each serving model's own rate. | [packages/core/src/l0/events.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L100) |
| `durationMs` | `number` | Wall-clock activation duration. Live telemetry only: replayed phase pairs (reconstructed from the terminal entry's usage slices) carry 0. | [packages/core/src/l0/events.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L96) |
| `invocation` | `number` | - | [packages/core/src/l0/events.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L90) |
| `label?` | `string` | - | [packages/core/src/l0/events.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L86) |
| `model` | `string` | The model that actually served the activation's last attempt. | [packages/core/src/l0/events.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L89) |
| `outcome` | `"ok"` \| `"error"` | - | [packages/core/src/l0/events.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L101) |
| `retries?` | `number` | Transport retries inside this activation. Present only when greater than zero; live telemetry only (absent on replay). | [packages/core/src/l0/events.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L106) |
| `role` | `string` | - | [packages/core/src/l0/events.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L87) |
| `type` | `"agent:phase:end"` | - | [packages/core/src/l0/events.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L84) |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | The usage this activation added to its (role, model) slices. | [packages/core/src/l0/events.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L98) |

***

### Type Literal

```ts
{
  agentType: string;
  costUsd: number;
  entryRef: number;
  label?: string;
  retryCount?: number;
  status: string;
  type: "agent:end";
  usage: Usage;
  usageApprox?: boolean;
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L110) |
| `costUsd` | `number` | - | [packages/core/src/l0/events.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L114) |
| `entryRef` | `number` | - | [packages/core/src/l0/events.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L115) |
| `label?` | `string` | - | [packages/core/src/l0/events.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L111) |
| `retryCount?` | `number` | Total transport retries across the span's activations. Present only when greater than zero; live telemetry only, never journaled, so a replayed agent:end omits it (absent means "zero or unknown"). | [packages/core/src/l0/events.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L130) |
| `status` | `string` | - | [packages/core/src/l0/events.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L112) |
| `type` | `"agent:end"` | - | [packages/core/src/l0/events.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L109) |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/l0/events.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L113) |
| `usageApprox?` | `boolean` | Present and true when this agent's usage is approximate rather than reported by the provider (the turn was cut by a transport failure, a ceiling that severed the stream, or an abort). Absent means the provider reported the usage exactly. Mirrors the terminal journal entry's usageApprox. | [packages/core/src/l0/events.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L123) |

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
