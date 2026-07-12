[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SandboxHostToWorker

# Type Alias: SandboxHostToWorker

```ts
type SandboxHostToWorker = 
  | {
  id: number;
  t: "result";
  value: Json;
}
  | {
  error: WireError;
  id: number;
  t: "error";
}
  | {
  args: Json[];
  fnId: number;
  id: number;
  t: "thunk:run";
  token: number;
};
```

Defined in: [packages/core/src/runner/sandbox-bridge.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/sandbox-bridge.ts#L67)

Host-to-worker protocol messages (JSON only).
