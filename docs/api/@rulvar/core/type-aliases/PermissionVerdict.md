[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PermissionVerdict

# Type Alias: PermissionVerdict

```ts
type PermissionVerdict = 
  | {
  decidedBy: "hook" | "canUseTool" | "default";
  input: unknown;
  verdict: "allow";
}
  | {
  decidedBy: "hook" | "deny-rule" | "canUseTool";
  input: unknown;
  rule?: PermissionRule;
  verdict: "deny";
}
  | {
  decidedBy: "hook" | "ask-rule" | "default";
  input: unknown;
  rule?: PermissionRule;
  verdict: "ask";
} & {
  advisory?: PermissionRule[];
};
```

Defined in: [packages/core/src/runtime/permission-chain.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L80)

## Type Declaration

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `advisory?` | [`PermissionRule`](/api/@rulvar/core/type-aliases/PermissionRule.md)[] | Advisory domain-rule matches: reported in audit events, never enforced outside the first-party fetch tool. | [packages/core/src/runtime/permission-chain.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L99) |
