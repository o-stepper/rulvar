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
| `agentType` | `string` | - | `packages/core/dist/index.d.ts` |
| `costUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| `entryRef` | `number` | - | `packages/core/dist/index.d.ts` |
| `label?` | `string` | - | `packages/core/dist/index.d.ts` |
| `retryCount?` | `number` | Total transport retries across the span's activations. Present only when greater than zero; live telemetry only, never journaled, so a replayed agent:end omits it (absent means "zero or unknown"). | `packages/core/dist/index.d.ts` |
| `status` | `string` | - | `packages/core/dist/index.d.ts` |
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
