[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResumePreview

# Interface: ResumePreview

Defined in: [packages/core/src/engine/engine.ts:205](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L205)

Resume-time hit/miss/orphan accounting.

## Extends

- [`ResumeReport`](/api/@rulvar/core/interfaces/ResumeReport.md)

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-hits"></a> `hits` | `number` | - | [`ResumeReport`](/api/@rulvar/core/interfaces/ResumeReport.md).[`hits`](/api/@rulvar/core/interfaces/ResumeReport.md#property-hits) | [packages/core/src/journal/matching.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L75) |
| <a id="property-invalidresolutions"></a> `invalidResolutions` | \{ `detail`: `string`; `seq`: `number`; \}[] | - | - | [packages/core/src/engine/engine.ts:206](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L206) |
| <a id="property-misses"></a> `misses` | `number` | - | [`ResumeReport`](/api/@rulvar/core/interfaces/ResumeReport.md).[`misses`](/api/@rulvar/core/interfaces/ResumeReport.md#property-misses) | [packages/core/src/journal/matching.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L76) |
| <a id="property-orphaned"></a> `orphaned` | `number`[] | Journaled operations never consumed by any live call (deleted calls). | [`ResumeReport`](/api/@rulvar/core/interfaces/ResumeReport.md).[`orphaned`](/api/@rulvar/core/interfaces/ResumeReport.md#property-orphaned) | [packages/core/src/journal/matching.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L80) |
| <a id="property-reruns"></a> `reruns` | `number` | - | [`ResumeReport`](/api/@rulvar/core/interfaces/ResumeReport.md).[`reruns`](/api/@rulvar/core/interfaces/ResumeReport.md#property-reruns) | [packages/core/src/journal/matching.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L78) |
| <a id="property-skipped"></a> `skipped` | `number` | - | [`ResumeReport`](/api/@rulvar/core/interfaces/ResumeReport.md).[`skipped`](/api/@rulvar/core/interfaces/ResumeReport.md#property-skipped) | [packages/core/src/journal/matching.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L77) |
