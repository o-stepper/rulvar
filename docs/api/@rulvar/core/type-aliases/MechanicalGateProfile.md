[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / MechanicalGateProfile

# Type Alias: MechanicalGateProfile

```ts
type MechanicalGateProfile = (artifacts) => MechanicalGateVerdict;
```

Defined in: [packages/core/src/runtime/agent-loop.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L94)

A mechanical acceptance gate: an engine-registered NAMED pure function
over AgentResult.artifacts (docs/04, section 12; docs/07, section 10).
The registry is per engine like every other registry (docs/02); the
ladder driver journals each evaluation as a decision entry, so the
ladder fold consumes only journaled verdicts, never live re-evaluation.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `artifacts` | readonly [`Artifact`](/api/@rulvar/core/interfaces/Artifact.md)[] |

## Returns

[`MechanicalGateVerdict`](/api/@rulvar/core/interfaces/MechanicalGateVerdict.md)
