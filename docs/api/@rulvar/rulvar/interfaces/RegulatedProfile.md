[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RegulatedProfile

# Interface: RegulatedProfile

Defined in: `packages/core/dist/index.d.ts`

What compileRegulatedProfile returns: apply verbatim.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-engine"></a> `engine` | [`CreateEngineOptions`](/api/@rulvar/rulvar/interfaces/CreateEngineOptions.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-orchestrate"></a> `orchestrate?` | [`OrchestrateOptions`](/api/@rulvar/rulvar/interfaces/OrchestrateOptions.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-profilehash"></a> `profileHash` | `string` | sha256 over the enforced posture map (version marker included), already composed into run.configFingerprint, so genesis records it and ResumeOptions.configFingerprint asserts it back with the RV3210 machinery; no new meta surface. | `packages/core/dist/index.d.ts` |
| <a id="property-run"></a> `run` | [`RunOptions`](/api/@rulvar/rulvar/interfaces/RunOptions.md) | - | `packages/core/dist/index.d.ts` |
