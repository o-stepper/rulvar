[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / MechanicalGateProfile

# Type Alias: MechanicalGateProfile

```ts
type MechanicalGateProfile = (artifacts) => MechanicalGateVerdict;
```

Defined in: [packages/core/src/runtime/agent-loop.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L96)

A mechanical acceptance gate: an engine-registered NAMED pure function
over AgentResult.artifacts.
The registry is per engine like every other registry; the
ladder driver journals each evaluation as a decision entry, so the
ladder fold consumes only journaled verdicts, never live re-evaluation.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `artifacts` | readonly [`Artifact`](/api/@rulvar/core/interfaces/Artifact.md)[] |

## Returns

[`MechanicalGateVerdict`](/api/@rulvar/core/interfaces/MechanicalGateVerdict.md)
