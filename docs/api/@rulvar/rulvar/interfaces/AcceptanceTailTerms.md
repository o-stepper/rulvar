[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AcceptanceTailTerms

# Interface: AcceptanceTailTerms

Defined in: `packages/core/dist/index.d.ts`

The resolved terms behind [acceptanceTailRequiredUsd](/api/@rulvar/rulvar/functions/acceptanceTailRequiredUsd.md); journal-ready numbers.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-citationjudgeestusd"></a> `citationJudgeEstUsd?` | `number` | The citation audit judge terms (RV4004), present in the sum only when the audit is declared: `citationJudgePasses` is 1, 2 under the audit's own armed round (which also arms the composition term above and, with a claim pass configured past the draft, one more claim rejudge inside `judgePasses`). | `packages/core/dist/index.d.ts` |
| <a id="property-citationjudgepasses"></a> `citationJudgePasses?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-estrepaircostusd"></a> `estRepairCostUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-judgeestusd"></a> `judgeEstUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-judgepasses"></a> `judgePasses` | `number` | Worst-case judge dispatches: ('both' ? 2 : 1) plus one under an armed repair round. | `packages/core/dist/index.d.ts` |
| <a id="property-roundcompositionusd"></a> `roundCompositionUsd` | `number` | One more composition when the repair round is armed, priced at synthesis.estCost. | `packages/core/dist/index.d.ts` |
| <a id="property-synthesisreserveusd"></a> `synthesisReserveUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-workingroomusd"></a> `workingRoomUsd` | `number` | - | `packages/core/dist/index.d.ts` |
