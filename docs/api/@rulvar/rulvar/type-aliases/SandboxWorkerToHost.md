[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SandboxWorkerToHost

# Type Alias: SandboxWorkerToHost

```ts
type SandboxWorkerToHost = 
  | {
  id: number;
  method: SandboxMethod;
  params: Json;
  t: "call";
  token: number;
}
  | {
  id: number;
  t: "thunk:result";
  value: Json;
}
  | {
  error: WireError;
  id: number;
  t: "thunk:error";
}
  | {
  key?: string;
  subtype: "now" | "random" | "uuid";
  t: "rand";
  token: number;
  value: number | string;
}
  | {
  data?: Json;
  level: "debug" | "info" | "warn" | "error";
  msg: string;
  t: "log";
  token: number;
}
  | {
  busy: boolean;
  t: "state";
};
```

Defined in: `packages/core/dist/index.d.ts`

Worker-to-host protocol messages (JSON only).
