[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / HookVerdict

# Type Alias: HookVerdict

```ts
type HookVerdict = 
  | "allow"
  | "deny"
  | "ask"
  | {
  modifiedInput: unknown;
}
  | undefined;
```

Defined in: [packages/core/src/runtime/permission-chain.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L18)
