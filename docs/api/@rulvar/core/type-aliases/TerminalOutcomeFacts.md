[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TerminalOutcomeFacts

# Type Alias: TerminalOutcomeFacts

```ts
type TerminalOutcomeFacts = Pick<RunOutcome<unknown>, 
  | "status"
  | "error"
  | "completion"
  | "deliverableAccepted"
  | "resultAvailable"
  | "acceptedArtifactRef"
  | "claimConsistencyMeta"> & {
  cost: Pick<RunOutcome<unknown>["cost"], "totalUsd" | "grossUsd" | "byModel"> & {
     usageApprox?: boolean;
     wireRequests?: number;
  };
  usage: RunOutcome<unknown>["usage"];
};
```

Defined in: [packages/core/src/engine/terminal-envelope.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/terminal-envelope.ts#L30)

The outcome facts the assembler reads; a structural subset of RunOutcome.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `cost` | `Pick`\&lt;[`RunOutcome`](/api/@rulvar/core/type-aliases/RunOutcome.md)\&lt;`unknown`\&gt;\[`"cost"`\], `"totalUsd"` \| `"grossUsd"` \| `"byModel"`\&gt; & \{ `usageApprox?`: `boolean`; `wireRequests?`: `number`; \} | [packages/core/src/engine/terminal-envelope.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/terminal-envelope.ts#L44) |
| `usage` | [`RunOutcome`](/api/@rulvar/core/type-aliases/RunOutcome.md)\&lt;`unknown`\&gt;\[`"usage"`\] | [packages/core/src/engine/terminal-envelope.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/terminal-envelope.ts#L43) |
