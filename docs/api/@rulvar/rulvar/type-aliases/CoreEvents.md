[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / CoreEvents

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

Defined in: `packages/core/dist/index.d.ts`

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
| `childStatusCounts?` | `Record`\&lt;`string`, `number`\&gt; | Settled child statuses by status name, lifted from the same envelope (or typed error data) when it carries a valid record of nonnegative integers. Absent otherwise. | `packages/core/dist/index.d.ts` |
| `completion?` | `"complete"` \| `"partial"` \| `"rejected"` | The semantic completion lift (RV-207 tail): present when the workflow reported semantic completion through the completion envelope contract: an `ok`/`exhausted` run whose result value is an object carrying a valid `completion` literal, or an `error` run whose typed error data carries one (the orchestrator acceptance path emits both). Transport status says whether the run ran; completion says whether the work is COMPLETE: an accepted degraded run is `status: 'ok'` with `completion: 'partial'`. Replay recomputes the same value from the re-executed workflow, so the field is identical live and replayed. Absent when the workflow makes no completion claim. | `packages/core/dist/index.d.ts` |
| `status` | `"ok"` \| `"error"` \| `"cancelled"` \| `"exhausted"` \| `"suspended"` | - | `packages/core/dist/index.d.ts` |
| `totalUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| `type` | `"run:end"` | - | `packages/core/dist/index.d.ts` |
| `usageApprox?` | `boolean` | Present and true when any priced usage folded into totalUsd is approximate (a transport cut, a stream the ceiling severed, or an abort left a turn's usage estimated rather than reported by the provider), so totalUsd is a lower bound estimate, never an exact charge. Absent means every contributing turn reported exact usage. | `packages/core/dist/index.d.ts` |

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
