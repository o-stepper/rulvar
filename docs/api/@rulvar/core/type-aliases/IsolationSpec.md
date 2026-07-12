[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / IsolationSpec

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

Defined in: [packages/core/src/l0/spi/isolation.ts:17](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/isolation.ts#L17)

The canonical identity encoding of spawn isolation: this exact value
domain enters spawn identity (docs/03, section "Identity model").
'readonly' is a determinism and blast-radius declaration, not
containment.
