[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / MechanicalGateProfile

# Type Alias: MechanicalGateProfile

```ts
type MechanicalGateProfile = (artifacts) => MechanicalGateVerdict;
```

Defined in: `packages/core/dist/index.d.ts`

A mechanical acceptance gate: an engine-registered NAMED pure function
over AgentResult.artifacts.
The registry is per engine like every other registry; the
ladder driver journals each evaluation as a decision entry, so the
ladder fold consumes only journaled verdicts, never live re-evaluation.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `artifacts` | readonly [`Artifact`](/api/@rulvar/rulvar/interfaces/Artifact.md)[] |

## Returns

[`MechanicalGateVerdict`](/api/@rulvar/rulvar/interfaces/MechanicalGateVerdict.md)
