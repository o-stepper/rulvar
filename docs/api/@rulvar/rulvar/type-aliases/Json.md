[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / Json

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

Defined in: `packages/core/dist/index.d.ts`

L0 JSON value domain.

Everything that enters the journal (entry values, error data, artifacts)
MUST be JSON-serializable; `Json` is the type-level face of that rule.
