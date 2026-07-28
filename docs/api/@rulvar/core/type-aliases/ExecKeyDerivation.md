[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ExecKeyDerivation

# Type Alias: ExecKeyDerivation

```ts
type ExecKeyDerivation = 
  | {
  version: 1;
}
  | {
  genesis: string;
  version: 2;
};
```

Defined in: [packages/core/src/runtime/executor.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/executor.ts#L29)

Which exec idempotency key derivation a run uses (RV403), resolved at
engine boot from RunMeta.execKeyDerivation. Version 1 is the original
genesis-free five-part key, the only derivation runs recorded without
the meta field can ever use; version 2 additionally binds the run's
generation token, so it must carry it.
