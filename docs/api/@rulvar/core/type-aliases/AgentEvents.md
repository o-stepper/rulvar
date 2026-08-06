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

Defined in: [packages/core/src/l0/events.ts:259](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L259)

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
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:264](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L264) |
| `invocation` | `number` | 1-based activation ordinal within the span, unique per activation (a summarize that fires three times gets three pairs). Key phases by (spanId, invocation). | [packages/core/src/l0/events.ts:275](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L275) |
| `label?` | `string` | - | [packages/core/src/l0/events.ts:265](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L265) |
| `model` | `string` | The model the activation resolved to (fallbacks may serve another; the end event reports the server). | [packages/core/src/l0/events.ts:269](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L269) |
| `role` | `string` | The invocation role this phase activation runs as. | [packages/core/src/l0/events.ts:267](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L267) |
| `type` | `"agent:phase:start"` | - | [packages/core/src/l0/events.ts:263](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L263) |

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
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:279](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L279) |
| `costBasis?` | [`CostBasis`](/api/@rulvar/core/type-aliases/CostBasis.md) | The fold behind `costUsd` (RV702). Live phase deltas are always per-call (every slice a live activation adds is backed by a recorded provider call); a replayed pair says 'aggregate-estimate' exactly when its model's records do not cover its usage. Absent on streams recorded before RV702, which priced the aggregate. | [packages/core/src/l0/events.ts:302](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L302) |
| `costUsd` | `number` | That usage priced at each serving model's own rate. | [packages/core/src/l0/events.ts:294](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L294) |
| `durationMs` | `number` | Wall-clock activation duration. Live telemetry only: replayed phase pairs (reconstructed from the terminal entry's usage slices) carry 0. | [packages/core/src/l0/events.ts:290](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L290) |
| `invocation` | `number` | - | [packages/core/src/l0/events.ts:284](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L284) |
| `label?` | `string` | - | [packages/core/src/l0/events.ts:280](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L280) |
| `model` | `string` | The model that actually served the activation's last attempt. | [packages/core/src/l0/events.ts:283](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L283) |
| `outcome` | `"ok"` \| `"error"` | - | [packages/core/src/l0/events.ts:303](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L303) |
| `retries?` | `number` | Transport retries inside this activation. Present only when greater than zero; live telemetry only (absent on replay). | [packages/core/src/l0/events.ts:308](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L308) |
| `role` | `string` | - | [packages/core/src/l0/events.ts:281](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L281) |
| `type` | `"agent:phase:end"` | - | [packages/core/src/l0/events.ts:278](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L278) |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | The usage this activation added to its (role, model) slices. | [packages/core/src/l0/events.ts:292](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L292) |

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
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:312](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L312) |
| `costBasis?` | [`CostBasis`](/api/@rulvar/core/type-aliases/CostBasis.md) | The fold behind `costUsd` (RV702): 'per-call' when every usage slice of the invocation (restored included) is covered by per-request records priced individually, the settled fold's own basis; 'aggregate-estimate' when it is not (the aggregate number is kept so restored spend is never silently dropped, and labeled so it is never mistaken for the per-request fold). Absent on streams recorded before RV702, which priced the aggregate. | [packages/core/src/l0/events.ts:326](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L326) |
| `costUsd` | `number` | - | [packages/core/src/l0/events.ts:316](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L316) |
| `entryRef` | `number` | - | [packages/core/src/l0/events.ts:327](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L327) |
| `exploration?` | [`ExplorationSummary`](/api/@rulvar/core/interfaces/ExplorationSummary.md) | The exploration guard counters (RV-210). Present live whenever any exploration guard limit was configured for the invocation; on replay present only when the guard abort journaled it in the terminal error payload. | [packages/core/src/l0/events.ts:349](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L349) |
| `label?` | `string` | - | [packages/core/src/l0/events.ts:313](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L313) |
| `retryCount?` | `number` | Total transport retries across the span's activations. Present only when greater than zero; live telemetry only, never journaled, so a replayed agent:end omits it (absent means "zero or unknown"). | [packages/core/src/l0/events.ts:342](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L342) |
| `status` | `string` | - | [packages/core/src/l0/events.ts:314](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L314) |
| `toolBudget?` | [`ToolBudgetSummary`](/api/@rulvar/core/interfaces/ToolBudgetSummary.md) | The tool budget pressure snapshot (RV304). Present live whenever a tool budget limiter or the extension was configured; live telemetry only, absent on replay. | [packages/core/src/l0/events.ts:355](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L355) |
| `type` | `"agent:end"` | - | [packages/core/src/l0/events.ts:311](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L311) |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/l0/events.ts:315](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L315) |
| `usageApprox?` | `boolean` | Present and true when this agent's usage is approximate rather than reported by the provider (the turn was cut by a transport failure, a ceiling that severed the stream, or an abort). Absent means the provider reported the usage exactly. Mirrors the terminal journal entry's usageApprox. | [packages/core/src/l0/events.ts:335](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L335) |

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

A recoverable pre-wire quota wait (RV1810): the shared limiter
denied a window and the dispatch will retry after the wait. This
is healthy throttling, not failure: it produces no provider
attempt, no ledger row, and no transport retry, and it used to
ride `agent:error` (data.source 'quota-limiter'), where naive
alerting on the event TYPE read a failing run out of a clean one.
Terminal denial exhaustion still ends in a real `agent:error`;
`createEngine({ telemetry: { quotaDeniedAgentError: true } })`
restores the legacy twin for consumers keyed to the old type.

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:371](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L371) |
| `label?` | `string` | - | [packages/core/src/l0/events.ts:372](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L372) |
| `model?` | `string` | The denied model ref. | [packages/core/src/l0/events.ts:374](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L374) |
| `reason?` | `string` | The limiter's reason ('tokensPerMinute 1800000 exhausted'). | [packages/core/src/l0/events.ts:376](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L376) |
| `retryAfterMs?` | `number` | - | [packages/core/src/l0/events.ts:377](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L377) |
| `type` | `"quota:denied"` | - | [packages/core/src/l0/events.ts:370](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L370) |
| `willRetry` | `true` | - | [packages/core/src/l0/events.ts:378](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L378) |

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

A transient in-flight exposure refusal on an orchestrate-owned
root dispatch (RV1902): the turn's worst-case estimate did not fit
`maxInFlightExposureUsd` beside the live child dispatches, so the
root parks until a hold releases and then retries, exactly the
transient semantics the budgets guide promises. Healthy backpressure,
not failure: no provider attempt, no ledger row, no journal entry.
`willWait: false` names the drained arm: nothing is left to wait
out (no live hold), so the refusal is terminal for the turn and the
orchestration settles its documented forced-finish partial instead
of tearing the run down. Plain (non-root) agents never emit this:
they keep the documented settle-as-budget-error behavior.

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:395](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L395) |
| `capUsd?` | `number` | The refusal arithmetic, verbatim from the typed refusal. | [packages/core/src/l0/events.ts:400](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L400) |
| `estimateUsd?` | `number` | - | [packages/core/src/l0/events.ts:403](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L403) |
| `inFlightUsd?` | `number` | - | [packages/core/src/l0/events.ts:402](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L402) |
| `label?` | `string` | - | [packages/core/src/l0/events.ts:396](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L396) |
| `model?` | `string` | The refused model ref. | [packages/core/src/l0/events.ts:398](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L398) |
| `spentUsd?` | `number` | - | [packages/core/src/l0/events.ts:401](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L401) |
| `type` | `"budget:exposure-wait"` | - | [packages/core/src/l0/events.ts:394](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L394) |
| `willWait` | `boolean` | - | [packages/core/src/l0/events.ts:404](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L404) |

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

Non-billable control egress (RV1804): a provider request that is
not a model dispatch and lands in no invoice row, today exactly the
admission countTokens probe (which carries the FULL child prompt).
'ok' names a counted probe, 'failed' a probe the provider refused
(the flat reserve admits instead), 'denied' a probe the configured
countTokens policy stopped before it left the process. Live
telemetry only, never journaled.

***

### Type Literal

```ts
{
  delta: string;
  type: "agent:stream";
}
```

Emitted only when the call opts into streaming; never journaled, never re-emitted.
