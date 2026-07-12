[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / CreateServerOptions

# Interface: CreateServerOptions

Defined in: [packages/cli/src/server.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/server.ts#L58)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-engine"></a> `engine` | [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md) | - | [packages/cli/src/server.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/server.ts#L59) |
| <a id="property-priceusd"></a> `priceUsd?` | (`servedBy`, `usage`) => `number` \| `undefined` | Prices the journal fold behind GET /runs/:id/cost for runs without a settled in-process outcome (the host assembles pricing exactly as it does for the CLI); absent means those usages surface as `unpriced`, never a silent zero (docs/04, section 10). | [packages/cli/src/server.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/server.ts#L68) |
| <a id="property-retention"></a> `retention?` | (`meta`) => `boolean` | Opt-in retention (docs/02, 8.2; OQ-20 executed at M8-T04): evaluated when a tracked run settles terminally; a true verdict applies engine.deleteRun (transcript cascade, then the journal) and untracks the run. Absent means everything persists indefinitely. | [packages/cli/src/server.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/server.ts#L75) |
| <a id="property-workflows"></a> `workflows` | [`WorkflowRegistry`](/api/@rulvar/rulvar/type-aliases/WorkflowRegistry.md) | The explicit, first-class registry (docs/06, section 10.4). | [packages/cli/src/server.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/server.ts#L61) |
