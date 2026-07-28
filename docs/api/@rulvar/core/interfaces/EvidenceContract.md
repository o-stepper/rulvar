[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EvidenceContract

# Interface: EvidenceContract

Defined in: [packages/core/src/engine/ctx.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L188)

A declared evidence floor for preflight to judge tool caps against
(RV303). Declarative only; see [AgentProfile.evidenceContract](/api/@rulvar/core/interfaces/AgentProfile.md#property-evidencecontract).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-estcallsperentry"></a> `estCallsPerEntry?` | `number` | Estimated executed calls per recorded entry; default 3. | [packages/core/src/engine/ctx.ts:192](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L192) |
| <a id="property-minentries"></a> `minEntries` | `number` | Evidence entries the task must record; positive integer. | [packages/core/src/engine/ctx.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L190) |
| <a id="property-overheadcalls"></a> `overheadCalls?` | `number` | Estimated non-evidence overhead calls; default 8. | [packages/core/src/engine/ctx.ts:194](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L194) |
