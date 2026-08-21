[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CapacitySheetSpec

# Interface: CapacitySheetSpec

Defined in: [packages/core/src/orchestrator/capacity-sheet.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L56)

The closed input schema of the sheet (RV4304).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-economics"></a> `economics?` | \{ `budgetUsd?`: `number`; `estCostPerWireUsd?`: `number`; \} | - | [packages/core/src/orchestrator/capacity-sheet.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L67) |
| `economics.budgetUsd?` | `number` | The run's declared ceiling. | [packages/core/src/orchestrator/capacity-sheet.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L71) |
| `economics.estCostPerWireUsd?` | `number` | Declared mean cost of one wire. | [packages/core/src/orchestrator/capacity-sheet.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L69) |
| <a id="property-observed"></a> `observed?` | \{ `physicalWireRequests?`: `number`; `source`: `string`; `totalUsd?`: `number`; `wallMs?`: `number`; \} | Measured facts of a RUN (the invoice, the telemetry), rendered in their own section with their source on every row and never folded into the declared arithmetic: 122 observed wires beside a declared 34 is a finding about the declaration, not an input to it. | [packages/core/src/orchestrator/capacity-sheet.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L79) |
| `observed.physicalWireRequests?` | `number` | - | [packages/core/src/orchestrator/capacity-sheet.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L82) |
| `observed.source` | `string` | Where the numbers were measured: 'invoice', 'telemetry', a report name. | [packages/core/src/orchestrator/capacity-sheet.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L81) |
| `observed.totalUsd?` | `number` | - | [packages/core/src/orchestrator/capacity-sheet.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L83) |
| `observed.wallMs?` | `number` | - | [packages/core/src/orchestrator/capacity-sheet.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L84) |
| <a id="property-plan"></a> `plan` | [`WireCapacitySpec`](/api/@rulvar/core/interfaces/WireCapacitySpec.md) | The declared plan; the sheet embeds [wireCapacityEstimate](/api/@rulvar/core/functions/wireCapacityEstimate.md). | [packages/core/src/orchestrator/capacity-sheet.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L58) |
| <a id="property-retries"></a> `retries?` | `number` | Expected transport retries against the base ([retryWireMultiplier](/api/@rulvar/core/functions/retryWireMultiplier.md)). | [packages/core/src/orchestrator/capacity-sheet.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L60) |
| <a id="property-service"></a> `service?` | \{ `concurrency?`: `number`; `serviceTimeMsPerWire?`: `number`; \} | - | [packages/core/src/orchestrator/capacity-sheet.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L61) |
| `service.concurrency?` | `number` | Concurrent wires in flight. | [packages/core/src/orchestrator/capacity-sheet.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L63) |
| `service.serviceTimeMsPerWire?` | `number` | Mean service time of ONE wire, milliseconds. | [packages/core/src/orchestrator/capacity-sheet.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/capacity-sheet.ts#L65) |
