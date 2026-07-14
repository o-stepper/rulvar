[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / IsolationSpec

# Type Alias: IsolationSpec

```ts
type IsolationSpec = 
  | "none"
  | "readonly"
  | {
  kind: "worktree";
  ref?: string;
};
```

Defined in: `packages/core/dist/index.d.ts`

The canonical identity encoding of spawn isolation: this exact value
domain enters spawn identity.
'readonly' is a determinism and blast-radius declaration, not
containment.
