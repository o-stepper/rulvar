[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RiskRuleValue

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
ADVISORY for every tool in the current release: they never
change a verdict, and matches surface in the tool:end audit
fields (enforcement will live in a first-party fetch tool
when one ships).
