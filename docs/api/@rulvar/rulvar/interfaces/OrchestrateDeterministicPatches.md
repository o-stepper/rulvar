[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / OrchestrateDeterministicPatches

# Interface: OrchestrateDeterministicPatches

Defined in: `packages/core/dist/index.d.ts`

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
| <a id="property-decisions"></a> `decisions` | `number` | Finish decisions whose deterministic repair was accepted. | `packages/core/dist/index.d.ts` |
| <a id="property-lastafterhash"></a> `lastAfterHash` | `string` | The LAST accepted repair's canonical post-patch hash; the judge rules on these bytes. | `packages/core/dist/index.d.ts` |
| <a id="property-lastbeforehash"></a> `lastBeforeHash` | `string` | The LAST accepted repair's canonical pre-patch hash. | `packages/core/dist/index.d.ts` |
| <a id="property-patches"></a> `patches` | `number` | Total individual patches across those decisions. | `packages/core/dist/index.d.ts` |
