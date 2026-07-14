[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / buildDeriverRegistry

# Function: buildDeriverRegistry()

```ts
function buildDeriverRegistry(extraDerivers?): DeriverRegistry;
```

Defined in: [packages/core/src/journal/keyderiver.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/keyderiver.ts#L154)

Builds the per-engine deriver registry: the shipped v1/v2 profiles plus
EngineOptions.extraDerivers, the ONLY window extender. A malformed
extra deriver is a ConfigError before any run effect.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `extraDerivers?` | readonly `unknown`[] |

## Returns

[`DeriverRegistry`](/api/@rulvar/core/type-aliases/DeriverRegistry.md)
