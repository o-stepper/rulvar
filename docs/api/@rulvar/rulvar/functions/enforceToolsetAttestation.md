[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / enforceToolsetAttestation

# Function: enforceToolsetAttestation()

```ts
function enforceToolsetAttestation(
   agentType, 
   attestation, 
   resolved): void;
```

Defined in: `packages/core/dist/index.d.ts`

Holds a spawn's resolved toolset to its profile's attested pin
(RV1514): a hash mismatch is a typed ConfigError before any provider
call or budget admission. With per-tool hashes on the attestation the
refusal names the drift (changed / missing / unexpected); without
them it lists the resolved per-tool hashes, so the pin can be
corrected from the refusal itself.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `agentType` | `string` |
| `attestation` | [`ToolsetAttestation`](/api/@rulvar/rulvar/interfaces/ToolsetAttestation.md) |
| `resolved` | [`ResolvedToolset`](/api/@rulvar/rulvar/interfaces/ResolvedToolset.md) |

## Returns

`void`
