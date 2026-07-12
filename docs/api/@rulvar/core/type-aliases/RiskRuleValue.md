[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RiskRuleValue

# Type Alias: RiskRuleValue

```ts
type RiskRuleValue = ToolRisk | "undeclared";
```

Defined in: [packages/core/src/runtime/permission-chain.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L34)

Declarative rule tables (no closures). `'undeclared'` in risk
position matches every tool WITHOUT declared risk: presets treat the
undeclared state conservatively. Argv rules
match through the real shell matcher; domain rules are
ADVISORY outside the first-party fetch tool: they never
change a verdict in M5, and matches surface in audit events.
