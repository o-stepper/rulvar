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
corrected from the refusal itself. When the pin carries the authority
side (RV1802), a contract-clean resolution is additionally held to
the attested authorityHash, so risk, needsApproval, executor, and
executorSpec drift refuses at the same pre-wire site; a legacy
contract-only pin keeps its documented posture and passes it.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `agentType` | `string` |
| `attestation` | [`ToolsetAttestation`](/api/@rulvar/rulvar/interfaces/ToolsetAttestation.md) |
| `resolved` | [`ResolvedToolset`](/api/@rulvar/rulvar/interfaces/ResolvedToolset.md) |

## Returns

`void`
