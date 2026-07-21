[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / RevisionGuardsOptions

# Interface: RevisionGuardsOptions

Defined in: [packages/plan/src/guards.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L57)

RevisionGuards configuration.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-droppedrevisionlimit"></a> `droppedRevisionLimit?` | `number` | Default 3 consecutive fully-dropped revisions. | [packages/plan/src/guards.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L61) |
| <a id="property-fallback"></a> `fallback?` | `"reject-revision"` \| `"finish-with-partial"` \| `"fail-run"` | Default 'finish-with-partial'; the chain is non-HITL and terminating. | [packages/plan/src/guards.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L59) |
| <a id="property-maxabandonednetusdfraction"></a> `maxAbandonedNetUsdFraction?` | `number` | Optional netLostUsd trigger as a fraction of the starting budget (DEF-5). | [packages/plan/src/guards.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L63) |
