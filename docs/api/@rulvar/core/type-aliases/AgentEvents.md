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

Defined in: [packages/core/src/l0/events.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L124)

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
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:129](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L129) |
| `invocation` | `number` | 1-based activation ordinal within the span, unique per activation (a summarize that fires three times gets three pairs). Key phases by (spanId, invocation). | [packages/core/src/l0/events.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L140) |
| `label?` | `string` | - | [packages/core/src/l0/events.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L130) |
| `model` | `string` | The model the activation resolved to (fallbacks may serve another; the end event reports the server). | [packages/core/src/l0/events.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L134) |
| `role` | `string` | The invocation role this phase activation runs as. | [packages/core/src/l0/events.ts:132](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L132) |
| `type` | `"agent:phase:start"` | - | [packages/core/src/l0/events.ts:128](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L128) |

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
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L144) |
| `costUsd` | `number` | That usage priced at each serving model's own rate. | [packages/core/src/l0/events.ts:159](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L159) |
| `durationMs` | `number` | Wall-clock activation duration. Live telemetry only: replayed phase pairs (reconstructed from the terminal entry's usage slices) carry 0. | [packages/core/src/l0/events.ts:155](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L155) |
| `invocation` | `number` | - | [packages/core/src/l0/events.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L149) |
| `label?` | `string` | - | [packages/core/src/l0/events.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L145) |
| `model` | `string` | The model that actually served the activation's last attempt. | [packages/core/src/l0/events.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L148) |
| `outcome` | `"ok"` \| `"error"` | - | [packages/core/src/l0/events.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L160) |
| `retries?` | `number` | Transport retries inside this activation. Present only when greater than zero; live telemetry only (absent on replay). | [packages/core/src/l0/events.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L165) |
| `role` | `string` | - | [packages/core/src/l0/events.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L146) |
| `type` | `"agent:phase:end"` | - | [packages/core/src/l0/events.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L143) |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | The usage this activation added to its (role, model) slices. | [packages/core/src/l0/events.ts:157](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L157) |

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
  type: "agent:end";
  usage: Usage;
  usageApprox?: boolean;
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L169) |
| `costUsd` | `number` | - | [packages/core/src/l0/events.ts:173](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L173) |
| `entryRef` | `number` | - | [packages/core/src/l0/events.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L174) |
| `exploration?` | [`ExplorationSummary`](/api/@rulvar/core/interfaces/ExplorationSummary.md) | The exploration guard counters (RV-210). Present live whenever any exploration guard limit was configured for the invocation; on replay present only when the guard abort journaled it in the terminal error payload. | [packages/core/src/l0/events.ts:196](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L196) |
| `label?` | `string` | - | [packages/core/src/l0/events.ts:170](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L170) |
| `retryCount?` | `number` | Total transport retries across the span's activations. Present only when greater than zero; live telemetry only, never journaled, so a replayed agent:end omits it (absent means "zero or unknown"). | [packages/core/src/l0/events.ts:189](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L189) |
| `status` | `string` | - | [packages/core/src/l0/events.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L171) |
| `type` | `"agent:end"` | - | [packages/core/src/l0/events.ts:168](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L168) |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/l0/events.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L172) |
| `usageApprox?` | `boolean` | Present and true when this agent's usage is approximate rather than reported by the provider (the turn was cut by a transport failure, a ceiling that severed the stream, or an abort). Absent means the provider reported the usage exactly. Mirrors the terminal journal entry's usageApprox. | [packages/core/src/l0/events.ts:182](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L182) |

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
