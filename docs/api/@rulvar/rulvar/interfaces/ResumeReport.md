[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ResumeReport

# Interface: ResumeReport

Defined in: `packages/core/dist/index.d.ts`

## Extended by

- [`ResumePreview`](/api/@rulvar/rulvar/interfaces/ResumePreview.md)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-hits"></a> `hits` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-misses"></a> `misses` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-orphaned"></a> `orphaned` | `number`[] | Effect roots that genuinely need recovery under the entry-type pairing rules: dangling dispatches (status 'running' with no terminal) and suspensions with no resolution, neither consumed by a live call nor covered by abandon. Complete operations are NEVER listed: settled roots, single-entry kinds (decisions, facts, plan and termination entries), and resolved suspensions are whole by construction. A call deleted from the code is silently skipped and never re-paid; it appears here only while its effect is dangling. | `packages/core/dist/index.d.ts` |
| <a id="property-reruns"></a> `reruns` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-skipped"></a> `skipped` | `number` | - | `packages/core/dist/index.d.ts` |
