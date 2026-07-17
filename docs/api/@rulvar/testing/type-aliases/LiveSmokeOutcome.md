[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / LiveSmokeOutcome

# Type Alias: LiveSmokeOutcome

```ts
type LiveSmokeOutcome = 
  | {
  attempts: number;
  events: ChatEvent[];
  status: "ok";
}
  | {
  attempts: number;
  error: WireError;
  events: ChatEvent[];
  status: "failed";
}
  | {
  attempts: number;
  errors: WireError[];
  status: "exhausted";
}
  | {
  attempts: number;
  events: ChatEvent[];
  status: "no-terminal";
}
  | {
  attempts: number;
  events: ChatEvent[];
  reason: "multiple-terminals" | "terminal-not-final";
  status: "contract-violation";
};
```

Defined in: [packages/testing/src/live.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/live.ts#L84)

The classified result of a bounded live smoke. `attempts` is how many
streams were actually opened; only `'exhausted'` reaches the
configured bound.
