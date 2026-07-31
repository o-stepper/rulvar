[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / TerminalOutcomeFacts

# Type Alias: TerminalOutcomeFacts

```ts
type TerminalOutcomeFacts = Pick<RunOutcome<unknown>, "status" | "error" | "completion"> & {
  cost: Pick<RunOutcome<unknown>["cost"], "totalUsd" | "grossUsd" | "byModel"> & {
     usageApprox?: boolean;
  };
  usage: RunOutcome<unknown>["usage"];
};
```

Defined in: `packages/core/dist/index.d.ts`

The outcome facts the assembler reads; a structural subset of RunOutcome.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `cost` | `Pick`\&lt;[`RunOutcome`](/api/@rulvar/rulvar/type-aliases/RunOutcome.md)\&lt;`unknown`\&gt;\[`"cost"`\], `"totalUsd"` \| `"grossUsd"` \| `"byModel"`\&gt; & \{ `usageApprox?`: `boolean`; \} | `packages/core/dist/index.d.ts` |
| `usage` | [`RunOutcome`](/api/@rulvar/rulvar/type-aliases/RunOutcome.md)\&lt;`unknown`\&gt;\[`"usage"`\] | `packages/core/dist/index.d.ts` |
