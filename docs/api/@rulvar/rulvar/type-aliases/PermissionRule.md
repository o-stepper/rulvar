[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / PermissionRule

# Type Alias: PermissionRule

```ts
type PermissionRule = 
  | {
  tool: string | string[];
}
  | {
  risk:   | RiskRuleValue
     | RiskRuleValue[];
}
  | {
  argv: string | string[];
  tool: string;
}
  | {
  domains: string[];
  tool: string;
};
```

Defined in: `packages/core/dist/index.d.ts`
