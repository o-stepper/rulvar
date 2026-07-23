[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / SoakQuorum

# Interface: SoakQuorum

Defined in: [packages/store-conformance/src/multi-process-soak.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L123)

Minimum activity the storm must reach before the referee stops it:
run-until-quorum makes the soak adaptive (a slow CI machine storms
longer, it never asserts on thin coverage).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-appends"></a> `appends` | `number` | Accepted journal appends (markers included). | [packages/store-conformance/src/multi-process-soak.ts:129](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L129) |
| <a id="property-blobdeletes"></a> `blobDeletes` | `number` | Accepted transcript blob deletes. | [packages/store-conformance/src/multi-process-soak.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L135) |
| <a id="property-blobputs"></a> `blobPuts` | `number` | Accepted transcript blob puts. | [packages/store-conformance/src/multi-process-soak.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L133) |
| <a id="property-epochs"></a> `epochs` | `number` | Distinct fencing epochs granted (each one is a takeover). | [packages/store-conformance/src/multi-process-soak.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L125) |
| <a id="property-livecrossrejects"></a> `liveCrossRejects` | `number` | Typed rejections of a live lease guarding a foreign run. | [packages/store-conformance/src/multi-process-soak.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L139) |
| <a id="property-metawrites"></a> `metaWrites` | `number` | Accepted meta writes. | [packages/store-conformance/src/multi-process-soak.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L131) |
| <a id="property-stalerejects"></a> `staleRejects` | `number` | Typed rejections observed by stale probe sweeps, all surfaces. | [packages/store-conformance/src/multi-process-soak.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L127) |
| <a id="property-victimcycles"></a> `victimCycles` | `number` | Full fenced-deletion cycles on side runs. | [packages/store-conformance/src/multi-process-soak.ts:137](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L137) |
