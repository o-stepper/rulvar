[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / effectLaneAdmissible

# Function: effectLaneAdmissible()

```ts
function effectLaneAdmissible(envelope): EffectLaneAdmissionVerdict;
```

Defined in: `packages/core/dist/index.d.ts`

Evaluates the five conjuncts of RFC section 5 over a terminal
envelope, fail closed on absence: an unsettled or superseded segment
never licenses effects; an `exhausted` or `cancelled` terminal can
still carry artifacts, but they are diagnostics, not deliverables; a
`partial` salvage is readable by humans and unacceptable to an
effect lane; without a finish contract there is no accepted
deliverable to act on; and `waived`, `partial`, `vacuous`, and
`not-judged` semantic verdicts all refuse, by the RV4209 rule.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `envelope` | [`TerminalEnvelope`](/api/@rulvar/rulvar/interfaces/TerminalEnvelope.md) |

## Returns

[`EffectLaneAdmissionVerdict`](/api/@rulvar/rulvar/type-aliases/EffectLaneAdmissionVerdict.md)
