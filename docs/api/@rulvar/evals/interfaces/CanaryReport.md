[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / CanaryReport

# Interface: CanaryReport

Defined in: [packages/evals/src/canary.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L52)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-allok"></a> `allOk` | `boolean` | True only when every probe settled ok. A fingerprint containing a non-ok probe status is a measurement artifact (budget exhaustion, transient provider failure), NOT evidence of model drift: never feed it to flipStaleOnCanaryDrift. | [packages/evals/src/canary.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L60) |
| <a id="property-fingerprint"></a> `fingerprint` | `string` | - | [packages/evals/src/canary.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L53) |
| <a id="property-probes"></a> `probes` | \{ `prompt`: `string`; `status`: `"ok"` \| `"error"` \| `"cancelled"` \| `"exhausted"` \| `"suspended"`; \}[] | - | [packages/evals/src/canary.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L61) |
