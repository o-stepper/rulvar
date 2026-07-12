[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RiskRuleValue

# Type Alias: RiskRuleValue

```ts
type RiskRuleValue = 
  | ToolRisk
  | "undeclared";
```

Defined in: `packages/core/dist/index.d.ts`

Declarative rule tables (no closures). `'undeclared'` in risk
position matches every tool WITHOUT declared risk: presets treat the
undeclared state conservatively. Argv rules
match through the real shell matcher; domain rules are
ADVISORY outside the first-party fetch tool: they never
change a verdict in M5, and matches surface in audit events.
