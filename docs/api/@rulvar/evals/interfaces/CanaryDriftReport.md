[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / CanaryDriftReport

# Interface: CanaryDriftReport

Defined in: [packages/evals/src/canary.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L142)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-flipped"></a> `flipped` | `string`[] | Claim ids flipped to stale by this call. | [packages/evals/src/canary.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L146) |
| <a id="property-freshfingerprint"></a> `freshFingerprint` | `string` | - | [packages/evals/src/canary.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L144) |
| <a id="property-model"></a> `model` | `` `${string}:${string}` `` | - | [packages/evals/src/canary.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L143) |
| <a id="property-version"></a> `version?` | `number` | The committed store version when anything flipped. | [packages/evals/src/canary.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L148) |
