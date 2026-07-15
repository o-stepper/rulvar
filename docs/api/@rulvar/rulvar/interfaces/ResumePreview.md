[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ResumePreview

# Interface: ResumePreview

Defined in: `packages/core/dist/index.d.ts`

Resume-time hit/miss/orphan accounting.

## Extends

- [`ResumeReport`](/api/@rulvar/rulvar/interfaces/ResumeReport.md)

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-hits"></a> `hits` | `number` | - | [`ResumeReport`](/api/@rulvar/rulvar/interfaces/ResumeReport.md).[`hits`](/api/@rulvar/rulvar/interfaces/ResumeReport.md#property-hits) | `packages/core/dist/index.d.ts` |
| <a id="property-invalidresolutions"></a> `invalidResolutions` | \{ `detail`: `string`; `seq`: `number`; \}[] | - | - | `packages/core/dist/index.d.ts` |
| <a id="property-misses"></a> `misses` | `number` | - | [`ResumeReport`](/api/@rulvar/rulvar/interfaces/ResumeReport.md).[`misses`](/api/@rulvar/rulvar/interfaces/ResumeReport.md#property-misses) | `packages/core/dist/index.d.ts` |
| <a id="property-orphaned"></a> `orphaned` | `number`[] | Effect roots that genuinely need recovery under the entry-type pairing rules: dangling dispatches (status 'running' with no terminal) and suspensions with no resolution, neither consumed by a live call nor covered by abandon. Complete operations are NEVER listed: settled roots, single-entry kinds (decisions, facts, plan and termination entries), and resolved suspensions are whole by construction. A call deleted from the code is silently skipped and never re-paid; it appears here only while its effect is dangling. | [`ResumeReport`](/api/@rulvar/rulvar/interfaces/ResumeReport.md).[`orphaned`](/api/@rulvar/rulvar/interfaces/ResumeReport.md#property-orphaned) | `packages/core/dist/index.d.ts` |
| <a id="property-reruns"></a> `reruns` | `number` | - | [`ResumeReport`](/api/@rulvar/rulvar/interfaces/ResumeReport.md).[`reruns`](/api/@rulvar/rulvar/interfaces/ResumeReport.md#property-reruns) | `packages/core/dist/index.d.ts` |
| <a id="property-skipped"></a> `skipped` | `number` | - | [`ResumeReport`](/api/@rulvar/rulvar/interfaces/ResumeReport.md).[`skipped`](/api/@rulvar/rulvar/interfaces/ResumeReport.md#property-skipped) | `packages/core/dist/index.d.ts` |
