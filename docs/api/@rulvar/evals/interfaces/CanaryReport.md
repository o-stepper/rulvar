[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / CanaryReport

# Interface: CanaryReport

Defined in: [packages/evals/src/canary.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L54)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-allok"></a> `allOk` | `boolean` | True only when every probe settled ok. A fingerprint containing a non-ok probe status is a measurement artifact (budget exhaustion, an envelope refusal, transient provider failure), NOT evidence of model drift: never feed it to flipStaleOnCanaryDrift. | [packages/evals/src/canary.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L62) |
| <a id="property-fingerprint"></a> `fingerprint` | `string` | - | [packages/evals/src/canary.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L55) |
| <a id="property-probes"></a> `probes` | \{ `prompt`: `string`; `status`: `"ok"` \| `"error"` \| `"cancelled"` \| `"exhausted"` \| `"suspended"` \| `"refused"`; \}[] | One row per probe; 'refused' means the aggregate envelope refused the probe before it started (v1.17.0 review P1-5): the loop keeps walking so completed probe evidence survives, and allOk is false. | [packages/evals/src/canary.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L68) |
