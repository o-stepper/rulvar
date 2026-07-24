[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / ExecutorErrorCode

# Type Alias: ExecutorErrorCode

```ts
type ExecutorErrorCode = 
  | "config"
  | "timeout"
  | "aborted"
  | "output-cap"
  | "exit"
  | "protocol"
  | "spawn";
```

Defined in: [packages/executor/src/spi.ts:14](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L14)

Why an isolated dispatch failed.
