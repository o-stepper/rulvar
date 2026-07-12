[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / buildDeriverRegistry

# Function: buildDeriverRegistry()

```ts
function buildDeriverRegistry(extraDerivers?): DeriverRegistry;
```

Defined in: `packages/core/dist/index.d.ts`

Builds the per-engine deriver registry: the shipped v1/v2 profiles plus
EngineOptions.extraDerivers, the ONLY window extender. A malformed
extra deriver is a ConfigError before any run effect.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `extraDerivers?` | readonly `unknown`[] |

## Returns

[`DeriverRegistry`](/api/@rulvar/rulvar/type-aliases/DeriverRegistry.md)
