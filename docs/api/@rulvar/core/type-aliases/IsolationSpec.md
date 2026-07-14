[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / IsolationSpec

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

Defined in: [packages/core/src/l0/spi/isolation.ts:16](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/isolation.ts#L16)

The canonical identity encoding of spawn isolation: this exact value
domain enters spawn identity.
'readonly' is a determinism and blast-radius declaration, not
containment.
