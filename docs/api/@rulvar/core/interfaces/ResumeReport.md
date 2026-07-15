[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResumeReport

# Interface: ResumeReport

Defined in: [packages/core/src/journal/matching.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L74)

## Extended by

- [`ResumePreview`](/api/@rulvar/core/interfaces/ResumePreview.md)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-hits"></a> `hits` | `number` | - | [packages/core/src/journal/matching.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L75) |
| <a id="property-misses"></a> `misses` | `number` | - | [packages/core/src/journal/matching.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L76) |
| <a id="property-orphaned"></a> `orphaned` | `number`[] | Effect roots that genuinely need recovery under the entry-type pairing rules: dangling dispatches (status 'running' with no terminal) and suspensions with no resolution, neither consumed by a live call nor covered by abandon. Complete operations are NEVER listed: settled roots, single-entry kinds (decisions, facts, plan and termination entries), and resolved suspensions are whole by construction. A call deleted from the code is silently skipped and never re-paid; it appears here only while its effect is dangling. | [packages/core/src/journal/matching.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L89) |
| <a id="property-reruns"></a> `reruns` | `number` | - | [packages/core/src/journal/matching.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L78) |
| <a id="property-skipped"></a> `skipped` | `number` | - | [packages/core/src/journal/matching.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L77) |
