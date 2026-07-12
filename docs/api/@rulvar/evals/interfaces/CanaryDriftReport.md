[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / CanaryDriftReport

# Interface: CanaryDriftReport

Defined in: [packages/evals/src/canary.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L61)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-flipped"></a> `flipped` | `string`[] | Claim ids flipped to stale by this call. | [packages/evals/src/canary.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L65) |
| <a id="property-freshfingerprint"></a> `freshFingerprint` | `string` | - | [packages/evals/src/canary.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L63) |
| <a id="property-model"></a> `model` | `` `${string}:${string}` `` | - | [packages/evals/src/canary.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L62) |
| <a id="property-version"></a> `version?` | `number` | The committed store version when anything flipped. | [packages/evals/src/canary.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L67) |
