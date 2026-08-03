[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / enforceToolsetAttestation

# Function: enforceToolsetAttestation()

```ts
function enforceToolsetAttestation(
   agentType, 
   attestation, 
   resolved): void;
```

Defined in: [packages/core/src/tools/toolset-hash.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/toolset-hash.ts#L93)

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
| `attestation` | [`ToolsetAttestation`](/api/@rulvar/core/interfaces/ToolsetAttestation.md) |
| `resolved` | [`ResolvedToolset`](/api/@rulvar/core/interfaces/ResolvedToolset.md) |

## Returns

`void`
