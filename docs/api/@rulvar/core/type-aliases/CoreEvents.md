[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CoreEvents

# Type Alias: CoreEvents

```ts
type CoreEvents = 
  | {
  resumed: boolean;
  type: "run:start";
  workflow: string;
}
  | {
  childStatusCounts?: Record<string, number>;
  completion?: "complete" | "partial" | "rejected";
  status: "ok" | "error" | "cancelled" | "exhausted" | "suspended";
  totalUsd: number;
  type: "run:end";
  usageApprox?: boolean;
}
  | {
  phase: string;
  type: "phase:start";
}
  | {
  data?: Json;
  level: "debug" | "info" | "warn" | "error";
  msg: string;
  type: "log";
}
  | {
  committedReserveUsd: number;
  remainingUsd: number | null;
  spentUsd: number;
  type: "budget:update";
}
  | {
  deadlineAt?: string;
  entryRef: number;
  key: string;
  prompt?: string;
  type: "external:waiting";
}
  | {
  deadlineAt?: string;
  entryRef: number;
  toolName: string;
  type: "approval:pending";
}
  | {
  scope: string;
  type: "child:start";
  workflow: string;
}
  | {
  scope: string;
  status: string;
  type: "child:end";
  workflow: string;
};
```

Defined in: [packages/core/src/l0/events.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L18)

Run lifecycle and core telemetry (M1 subset).

## Union Members

### Type Literal

```ts
{
  resumed: boolean;
  type: "run:start";
  workflow: string;
}
```

***

### Type Literal

```ts
{
  childStatusCounts?: Record<string, number>;
  completion?: "complete" | "partial" | "rejected";
  status: "ok" | "error" | "cancelled" | "exhausted" | "suspended";
  totalUsd: number;
  type: "run:end";
  usageApprox?: boolean;
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `childStatusCounts?` | `Record`\&lt;`string`, `number`\&gt; | Settled child statuses by status name, lifted from the same envelope (or typed error data) when it carries a valid record of nonnegative integers. Absent otherwise. | [packages/core/src/l0/events.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L51) |
| `completion?` | `"complete"` \| `"partial"` \| `"rejected"` | The semantic completion lift (RV-207 tail): present when the workflow reported semantic completion through the completion envelope contract: an `ok`/`exhausted` run whose result value is an object carrying a valid `completion` literal, or an `error` run whose typed error data carries one (the orchestrator acceptance path emits both). Transport status says whether the run ran; completion says whether the work is COMPLETE: an accepted degraded run is `status: 'ok'` with `completion: 'partial'`. Replay recomputes the same value from the re-executed workflow, so the field is identical live and replayed. Absent when the workflow makes no completion claim. | [packages/core/src/l0/events.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L45) |
| `status` | `"ok"` \| `"error"` \| `"cancelled"` \| `"exhausted"` \| `"suspended"` | - | [packages/core/src/l0/events.ts:22](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L22) |
| `totalUsd` | `number` | - | [packages/core/src/l0/events.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L23) |
| `type` | `"run:end"` | - | [packages/core/src/l0/events.ts:21](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L21) |
| `usageApprox?` | `boolean` | Present and true when any priced usage folded into totalUsd is approximate (a transport cut, a stream the ceiling severed, or an abort left a turn's usage estimated rather than reported by the provider), so totalUsd is a lower bound estimate, never an exact charge. Absent means every contributing turn reported exact usage. | [packages/core/src/l0/events.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L31) |

***

### Type Literal

```ts
{
  phase: string;
  type: "phase:start";
}
```

***

### Type Literal

```ts
{
  data?: Json;
  level: "debug" | "info" | "warn" | "error";
  msg: string;
  type: "log";
}
```

***

### Type Literal

```ts
{
  committedReserveUsd: number;
  remainingUsd: number | null;
  spentUsd: number;
  type: "budget:update";
}
```

***

### Type Literal

```ts
{
  deadlineAt?: string;
  entryRef: number;
  key: string;
  prompt?: string;
  type: "external:waiting";
}
```

***

### Type Literal

```ts
{
  deadlineAt?: string;
  entryRef: number;
  toolName: string;
  type: "approval:pending";
}
```

***

### Type Literal

```ts
{
  scope: string;
  type: "child:start";
  workflow: string;
}
```

***

### Type Literal

```ts
{
  scope: string;
  status: string;
  type: "child:end";
  workflow: string;
}
```
