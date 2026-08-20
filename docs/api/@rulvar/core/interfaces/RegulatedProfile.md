[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RegulatedProfile

# Interface: RegulatedProfile

Defined in: [packages/core/src/engine/regulated-profile.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/regulated-profile.ts#L54)

What compileRegulatedProfile returns: apply verbatim.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-engine"></a> `engine` | [`CreateEngineOptions`](/api/@rulvar/core/interfaces/CreateEngineOptions.md) | - | [packages/core/src/engine/regulated-profile.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/regulated-profile.ts#L55) |
| <a id="property-orchestrate"></a> `orchestrate?` | [`OrchestrateOptions`](/api/@rulvar/core/interfaces/OrchestrateOptions.md) | - | [packages/core/src/engine/regulated-profile.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/regulated-profile.ts#L57) |
| <a id="property-profilehash"></a> `profileHash` | `string` | sha256 over the enforced posture map (version marker included), already composed into run.configFingerprint, so genesis records it and ResumeOptions.configFingerprint asserts it back with the RV3210 machinery; no new meta surface. | [packages/core/src/engine/regulated-profile.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/regulated-profile.ts#L64) |
| <a id="property-run"></a> `run` | [`RunOptions`](/api/@rulvar/core/interfaces/RunOptions.md) | - | [packages/core/src/engine/regulated-profile.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/regulated-profile.ts#L56) |
