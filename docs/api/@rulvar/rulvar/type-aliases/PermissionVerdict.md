[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / PermissionVerdict

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

Defined in: `packages/core/dist/index.d.ts`

## Type Declaration

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `advisory?` | [`PermissionRule`](/api/@rulvar/rulvar/type-aliases/PermissionRule.md)[] | Advisory domain-rule matches: reported in the tool:end audit fields, never enforced in the current release. | `packages/core/dist/index.d.ts` |
