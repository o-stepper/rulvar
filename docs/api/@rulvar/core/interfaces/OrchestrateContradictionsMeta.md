[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OrchestrateContradictionsMeta

# Interface: OrchestrateContradictionsMeta

Defined in: [packages/core/src/orchestrator/orchestrate.ts:682](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L682)

What the contradiction pass looked at, beside its findings (RV1404).
Rides the acceptance envelope as `contradictionsMeta` whenever the
pass is configured, exactly like `contradictions` itself: `[]` plus
this meta says "the pass judged `poolChildren` accepted children and
the pool agreed", while an absent pair says nothing looked. The
`truncated` flag makes the `max` bound honest: without it, a capped
list is indistinguishable from a complete one.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-poolchildren"></a> `poolChildren` | `number` | How many accepted children the pass actually judged. | [packages/core/src/orchestrator/orchestrate.ts:684](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L684) |
| <a id="property-truncated"></a> `truncated` | `boolean` | True when more contradictions existed than `max` allowed to report. | [packages/core/src/orchestrator/orchestrate.ts:686](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L686) |
