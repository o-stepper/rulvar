[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / CapacitySheetSpec

# Interface: CapacitySheetSpec

Defined in: `packages/core/dist/index.d.ts`

The closed input schema of the sheet (RV4304).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-economics"></a> `economics?` | \{ `budgetUsd?`: `number`; `estCostPerWireUsd?`: `number`; \} | - | `packages/core/dist/index.d.ts` |
| `economics.budgetUsd?` | `number` | - | `packages/core/dist/index.d.ts` |
| `economics.estCostPerWireUsd?` | `number` | Declared mean cost of one wire. | `packages/core/dist/index.d.ts` |
| <a id="property-observed"></a> `observed?` | \{ `physicalWireRequests?`: `number`; `source`: `string`; `totalUsd?`: `number`; `wallMs?`: `number`; \} | Measured facts of a RUN (the invoice, the telemetry), rendered in their own section with their source on every row and never folded into the declared arithmetic: 122 observed wires beside a declared 34 is a finding about the declaration, not an input to it. | `packages/core/dist/index.d.ts` |
| `observed.physicalWireRequests?` | `number` | - | `packages/core/dist/index.d.ts` |
| `observed.source` | `string` | Where the numbers were measured: 'invoice', 'telemetry', a report name. | `packages/core/dist/index.d.ts` |
| `observed.totalUsd?` | `number` | - | `packages/core/dist/index.d.ts` |
| `observed.wallMs?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-plan"></a> `plan` | [`WireCapacitySpec`](/api/@rulvar/rulvar/interfaces/WireCapacitySpec.md) | The declared plan; the sheet embeds [wireCapacityEstimate](/api/@rulvar/rulvar/functions/wireCapacityEstimate.md). | `packages/core/dist/index.d.ts` |
| <a id="property-retries"></a> `retries?` | `number` | Expected transport retries against the base ([retryWireMultiplier](/api/@rulvar/rulvar/functions/retryWireMultiplier.md)). | `packages/core/dist/index.d.ts` |
| <a id="property-service"></a> `service?` | \{ `concurrency?`: `number`; `serviceTimeMsPerWire?`: `number`; \} | - | `packages/core/dist/index.d.ts` |
| `service.concurrency?` | `number` | Concurrent wires in flight. | `packages/core/dist/index.d.ts` |
| `service.serviceTimeMsPerWire?` | `number` | - | `packages/core/dist/index.d.ts` |
