[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AdmissionReservation

# Interface: AdmissionReservation

Defined in: `packages/core/dist/index.d.ts`

The reservation measures (RFC section 4.3). `wires` is the one
measure admission CAPS (and the SFQ cost unit); `inputTokens`,
`usd`, and `exposureUsd` ride the ticket for the holder's own
accounting and are never limited here (RV4909): money is the
budget layer's bound, and active work per level is bounded by the
level's `concurrency` semaphore.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-exposureusd"></a> `exposureUsd?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-inputtokens"></a> `inputTokens?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-usd"></a> `usd?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-wires"></a> `wires` | `number` | The one scheduler COST unit and the one capped measure. | `packages/core/dist/index.d.ts` |
