[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ToolCalibrationReport

# Interface: ToolCalibrationReport

Defined in: `packages/core/dist/index.d.ts`

The observed calls-per-evidence-entry calibration of one journal (RV3003).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-aggregate"></a> `aggregate?` | \{ `callsPerEntry?`: `number`; `recordedEntries`: `number`; `toolCallsUsed`: `number`; \} | The observed aggregate over `observed` rows: summed executed calls against summed recorded entries, with the rate absent when the entry sum is 0. Absent entirely when no row paired. | `packages/core/dist/index.d.ts` |
| `aggregate.callsPerEntry?` | `number` | - | `packages/core/dist/index.d.ts` |
| `aggregate.recordedEntries` | `number` | - | `packages/core/dist/index.d.ts` |
| `aggregate.toolCallsUsed` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-budgetonly"></a> `budgetOnly` | [`ToolCalibrationExclusion`](/api/@rulvar/rulvar/interfaces/ToolCalibrationExclusion.md)[] | A journaled counter with no declared contract: nothing to divide by. | `packages/core/dist/index.d.ts` |
| <a id="property-dispatches"></a> `dispatches` | `number` | Terminal agent dispatches the journal holds, the partition's whole. | `packages/core/dist/index.d.ts` |
| <a id="property-evidenceonly"></a> `evidenceOnly` | [`ToolCalibrationExclusion`](/api/@rulvar/rulvar/interfaces/ToolCalibrationExclusion.md)[] | A declared contract whose counter was never journaled (pre-RV3002 journals). | `packages/core/dist/index.d.ts` |
| <a id="property-observed"></a> `observed` | [`ToolCalibrationRow`](/api/@rulvar/rulvar/interfaces/ToolCalibrationRow.md)[] | Dispatches carrying both the verdict and the counter, in seq order. | `packages/core/dist/index.d.ts` |
| <a id="property-unobserved"></a> `unobserved` | `number` | Dispatches carrying neither side. | `packages/core/dist/index.d.ts` |
