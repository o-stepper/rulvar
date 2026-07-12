[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Json

# Type Alias: Json

```ts
type Json = 
  | null
  | boolean
  | number
  | string
  | Json[]
  | {
[key: string]: Json;
};
```

Defined in: [packages/core/src/l0/json.ts:9](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/json.ts#L9)

L0 JSON value domain.

Everything that enters the journal (entry values, error data, artifacts)
MUST be JSON-serializable (docs/03-journal-spec.md, section "Two-phase
entries, dispatch, and the budget ledger"); `Json` is the type-level face
of that rule.
