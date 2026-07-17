[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / CanaryDriftReport

# Interface: CanaryDriftReport

Defined in: [packages/evals/src/canary.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L123)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-flipped"></a> `flipped` | `string`[] | Claim ids flipped to stale by this call. | [packages/evals/src/canary.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L127) |
| <a id="property-freshfingerprint"></a> `freshFingerprint` | `string` | - | [packages/evals/src/canary.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L125) |
| <a id="property-model"></a> `model` | `` `${string}:${string}` `` | - | [packages/evals/src/canary.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L124) |
| <a id="property-version"></a> `version?` | `number` | The committed store version when anything flipped. | [packages/evals/src/canary.ts:129](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L129) |
