[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AcceptanceTailTerms

# Interface: AcceptanceTailTerms

Defined in: `packages/core/dist/index.d.ts`

The resolved terms behind [acceptanceTailRequiredUsd](/api/@rulvar/rulvar/functions/acceptanceTailRequiredUsd.md); journal-ready numbers.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-estrepaircostusd"></a> `estRepairCostUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-judgeestusd"></a> `judgeEstUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-judgepasses"></a> `judgePasses` | `number` | Worst-case judge dispatches: ('both' ? 2 : 1) plus one under an armed repair round. | `packages/core/dist/index.d.ts` |
| <a id="property-roundcompositionusd"></a> `roundCompositionUsd` | `number` | One more composition when the repair round is armed, priced at synthesis.estCost. | `packages/core/dist/index.d.ts` |
| <a id="property-synthesisreserveusd"></a> `synthesisReserveUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-workingroomusd"></a> `workingRoomUsd` | `number` | - | `packages/core/dist/index.d.ts` |
