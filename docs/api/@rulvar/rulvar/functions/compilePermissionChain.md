[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / compilePermissionChain

# Function: compilePermissionChain()

```ts
function compilePermissionChain(engine?, profile?): CompiledPermissionChain;
```

Defined in: `packages/core/dist/index.d.ts`

Merges the engine-wide config and the profile config into one chain.
Layers concatenate engine-first; since rules only deny or ask, ordering
within a layer cannot change the verdict. The
profile's canUseTool wins over the engine's (a single slot by
construction). A declared preset compiles INTO the same layers, after
the host-authored rules, never as a fifth layer (M5-T05).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `engine?` | [`PermissionConfig`](/api/@rulvar/rulvar/interfaces/PermissionConfig.md) |
| `profile?` | [`AgentProfilePermissions`](/api/@rulvar/rulvar/interfaces/AgentProfilePermissions.md) |

## Returns

[`CompiledPermissionChain`](/api/@rulvar/rulvar/interfaces/CompiledPermissionChain.md)
