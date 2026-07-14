[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PermissionRule

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

Defined in: [packages/core/src/runtime/permission-chain.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L38)
