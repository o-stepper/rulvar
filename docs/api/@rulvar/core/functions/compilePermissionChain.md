[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / compilePermissionChain

# Function: compilePermissionChain()

```ts
function compilePermissionChain(engine?, profile?): CompiledPermissionChain;
```

Defined in: [packages/core/src/runtime/permission-chain.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L112)

Merges the engine-wide config and the profile config into one chain.
Layers concatenate engine-first; since rules only deny or ask, ordering
within a layer cannot change the verdict. The
profile's canUseTool wins over the engine's (a single slot by
construction). A declared preset compiles INTO the same layers, after
the host-authored rules, never as a fifth layer (M5-T05).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `engine?` | [`PermissionConfig`](/api/@rulvar/core/interfaces/PermissionConfig.md) |
| `profile?` | [`AgentProfilePermissions`](/api/@rulvar/core/interfaces/AgentProfilePermissions.md) |

## Returns

[`CompiledPermissionChain`](/api/@rulvar/core/interfaces/CompiledPermissionChain.md)
