[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / EvalCommitterOptions

# Interface: EvalCommitterOptions

Defined in: [packages/evals/src/committer.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L42)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-attempts"></a> `attempts?` | `number` | CAS-rebase attempts; default 3. | [packages/evals/src/committer.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L48) |
| <a id="property-committerid"></a> `committerId` | `string` | The dedicated identity recorded on the gate AND the author. | [packages/evals/src/committer.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L44) |
| <a id="property-reportid"></a> `reportId` | `string` | The emitting sweep report; every claim's gate references it. | [packages/evals/src/committer.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L46) |
