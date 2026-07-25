[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / KillPointEvent

# Type Alias: KillPointEvent

```ts
type KillPointEvent = 
  | {
  prompt: string;
  t: "call";
}
  | {
  t: "tool";
  target: string;
}
  | {
  kind?: string;
  phase: KillPointPhase;
  point: KillPointName;
  seq?: number;
  site: "append" | "putMeta";
  status?: string;
  t: "kill";
}
  | {
  status: string;
  t: "ran-to-completion";
}
  | {
  message: string;
  t: "fatal";
};
```

Defined in: [packages/store-conformance/src/kill-points.ts:302](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L302)

One JSONL line of a worker's report file.
