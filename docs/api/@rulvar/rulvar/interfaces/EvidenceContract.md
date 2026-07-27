[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EvidenceContract

# Interface: EvidenceContract

Defined in: `packages/core/dist/index.d.ts`

A declared evidence floor for preflight to judge tool caps against
(RV303). Declarative only; see [AgentProfile.evidenceContract](/api/@rulvar/rulvar/interfaces/AgentProfile.md#property-evidencecontract).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-estcallsperentry"></a> `estCallsPerEntry?` | `number` | Estimated executed calls per recorded entry; default 3. | `packages/core/dist/index.d.ts` |
| <a id="property-minentries"></a> `minEntries` | `number` | Evidence entries the task must record; positive integer. | `packages/core/dist/index.d.ts` |
| <a id="property-overheadcalls"></a> `overheadCalls?` | `number` | Estimated non-evidence overhead calls; default 8. | `packages/core/dist/index.d.ts` |
