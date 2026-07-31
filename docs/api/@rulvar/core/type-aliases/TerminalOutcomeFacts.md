[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TerminalOutcomeFacts

# Type Alias: TerminalOutcomeFacts

```ts
type TerminalOutcomeFacts = Pick<RunOutcome<unknown>, "status" | "error" | "completion"> & {
  cost: Pick<RunOutcome<unknown>["cost"], "totalUsd" | "grossUsd" | "byModel"> & {
     usageApprox?: boolean;
  };
  usage: RunOutcome<unknown>["usage"];
};
```

Defined in: [packages/core/src/engine/terminal-envelope.ts:13](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/terminal-envelope.ts#L13)

The outcome facts the assembler reads; a structural subset of RunOutcome.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `cost` | `Pick`\&lt;[`RunOutcome`](/api/@rulvar/core/type-aliases/RunOutcome.md)\&lt;`unknown`\&gt;\[`"cost"`\], `"totalUsd"` \| `"grossUsd"` \| `"byModel"`\&gt; & \{ `usageApprox?`: `boolean`; \} | [packages/core/src/engine/terminal-envelope.ts:15](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/terminal-envelope.ts#L15) |
| `usage` | [`RunOutcome`](/api/@rulvar/core/type-aliases/RunOutcome.md)\&lt;`unknown`\&gt;\[`"usage"`\] | [packages/core/src/engine/terminal-envelope.ts:14](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/terminal-envelope.ts#L14) |
