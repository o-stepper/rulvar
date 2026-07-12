[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CoreEvents

# Type Alias: CoreEvents

```ts
type CoreEvents = 
  | {
  resumed: boolean;
  type: "run:start";
  workflow: string;
}
  | {
  status: "ok" | "error" | "cancelled" | "exhausted" | "suspended";
  totalUsd: number;
  type: "run:end";
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

docs/09 section 1.4, run lifecycle and core telemetry (M1 subset).
