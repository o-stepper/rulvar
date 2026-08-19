[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OrchestrateDeterministicPatches

# Interface: OrchestrateDeterministicPatches

Defined in: [packages/core/src/orchestrator/orchestrate.ts:1430](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1430)

The deterministic-repair aggregate of the shipped run (RV3904, the
fourth comparison experiment): the patches themselves stay on the
journaled finish-validation decisions (RV3801, byte-exact with
before/after hashes per decision); the acceptance envelope carries
the aggregate, so "was the shipped document machine-patched, and
from what bytes" is an envelope read instead of a journal walk.
Present exactly when at least one ACCEPTED deterministic repair
exists; every other envelope stays byte identical.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-decisions"></a> `decisions` | `number` | Finish decisions whose deterministic repair was accepted. | [packages/core/src/orchestrator/orchestrate.ts:1432](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1432) |
| <a id="property-lastafterhash"></a> `lastAfterHash` | `string` | The LAST accepted repair's canonical post-patch hash; the judge rules on these bytes. | [packages/core/src/orchestrator/orchestrate.ts:1438](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1438) |
| <a id="property-lastbeforehash"></a> `lastBeforeHash` | `string` | The LAST accepted repair's canonical pre-patch hash. | [packages/core/src/orchestrator/orchestrate.ts:1436](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1436) |
| <a id="property-patches"></a> `patches` | `number` | Total individual patches across those decisions. | [packages/core/src/orchestrator/orchestrate.ts:1434](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1434) |
