[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / compilePermissionChain

# Function: compilePermissionChain()

```ts
function compilePermissionChain(
   engine?, 
   profile?, 
   parent?): CompiledPermissionChain;
```

Defined in: `packages/core/dist/index.d.ts`

Merges the engine-wide config and the profile config into one chain.
Layers concatenate engine-first; since rules only deny or ask, ordering
within a layer cannot change the verdict. The
profile's canUseTool wins over the engine's (a single slot by
construction). A declared preset compiles INTO the same layers, after
the host-authored rules, never as a fifth layer (M5-T05).

The third argument is the spawning agent's layer (RV4912): its own
chain compiled with NO engine layer, so the engine layer is never
applied twice. It takes effect only when the profile declares
`inheritPermissions: true`, and then sits between the engine layer
and the profile's own layers: hooks run engine, inherited, profile;
the deny and ask tables concatenate in the same order with the
preset last; canUseTool and the approval deadline resolve profile
over inherited over engine; strictApprovals and hookAllow merge
monotonically across all three. Undeclared and false ignore the
argument and keep the historical chain byte for byte.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `engine?` | [`PermissionConfig`](/api/@rulvar/rulvar/interfaces/PermissionConfig.md) |
| `profile?` | [`AgentProfilePermissions`](/api/@rulvar/rulvar/interfaces/AgentProfilePermissions.md) |
| `parent?` | [`PermissionConfig`](/api/@rulvar/rulvar/interfaces/PermissionConfig.md) |

## Returns

[`CompiledPermissionChain`](/api/@rulvar/rulvar/interfaces/CompiledPermissionChain.md)
