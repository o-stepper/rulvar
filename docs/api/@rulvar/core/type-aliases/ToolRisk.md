[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolRisk

# Type Alias: ToolRisk

```ts
type ToolRisk = "read" | "write" | "network" | "execute" | "destructive";
```

Defined in: [packages/core/src/l0/spi/toolsource.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L20)

Declarative risk metadata on the tool contract. Policy input, not
identity: it does NOT enter toolsetHash (docs/08, section "Risk
metadata and permission presets").
