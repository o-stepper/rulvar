[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / IsolationSpec

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

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The canonical identity encoding of spawn isolation: this exact value
domain enters spawn identity (docs/03, section "Identity model").
'readonly' is a determinism and blast-radius declaration, not
containment.
