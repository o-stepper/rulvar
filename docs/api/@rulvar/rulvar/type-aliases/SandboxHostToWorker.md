[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SandboxHostToWorker

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

Defined in: `packages/core/dist/index.d.ts`

Host-to-worker protocol messages (JSON only).
