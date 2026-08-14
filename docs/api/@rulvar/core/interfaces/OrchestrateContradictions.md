[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OrchestrateContradictions

# Interface: OrchestrateContradictions

Defined in: [packages/core/src/orchestrator/orchestrate.ts:769](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L769)

The bounded contradiction pass's knobs (RV1302). The pass itself is a
PURE fold over the settled children the journal replays verbatim, so
it costs no model call, no clock, and no wall time worth measuring in
the post-fan-in window, and it journals nothing: a resume re-derives
the identical finding (the `dedupeClaims`, `policyFacts`, and
`evidenceIndex` precedent). The evidence pool it judges is the one
`evidenceIndex` indexes: ok children plus salvage-accepted ones, so a
dead child's error text can never contradict a real finding.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-max"></a> `max?` | `number` | Bound on reported contradictions; default [DEFAULT\_MAX\_CONTRADICTIONS](/api/@rulvar/core/variables/DEFAULT_MAX_CONTRADICTIONS.md). | [packages/core/src/orchestrator/orchestrate.ts:786](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L786) |
| <a id="property-onfound"></a> `onFound?` | `"report"` \| `"carry"` \| `"fail"` | What a detected contradiction does. 'report' (the default) puts the findings on the acceptance envelope and in an info log, and changes nothing else. 'carry' additionally names them in the 'single' synthesis prompt with the instruction to resolve each explicitly instead of silently picking one, and REQUIRES that synthesis (a ConfigError otherwise, the `evidenceIndex` precedent: there is no prompt to ride without it). 'fail' fails the run typed with `data.source` 'orchestrator_contradictions' BEFORE any synthesis dispatch, so a pool that contradicts itself never pays to have the disagreement composed away. | [packages/core/src/orchestrator/orchestrate.ts:782](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L782) |
| <a id="property-pattern"></a> `pattern?` | `string` | Overrides [DEFAULT\_CITATION\_PATTERN](/api/@rulvar/core/variables/DEFAULT_CITATION_PATTERN.md) for the anchors; fail-closed at intake. | [packages/core/src/orchestrator/orchestrate.ts:784](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L784) |
