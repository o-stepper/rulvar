[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ToolRisk

# Type Alias: ToolRisk

```ts
type ToolRisk = "read" | "write" | "network" | "execute" | "destructive";
```

Defined in: `packages/core/dist/index.d.ts`

Declarative risk metadata on the tool contract. Policy input, not
identity: it does NOT enter toolsetHash.
