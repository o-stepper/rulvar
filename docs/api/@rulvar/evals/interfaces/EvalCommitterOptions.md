[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / EvalCommitterOptions

# Interface: EvalCommitterOptions

Defined in: [packages/evals/src/committer.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L56)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-attempts"></a> `attempts?` | `number` | CAS rebase attempts; default 3. A positive integer, refused as a ConfigError before the first store read. | [packages/evals/src/committer.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L65) |
| <a id="property-committerid"></a> `committerId` | `string` | The dedicated identity recorded on the gate AND the author. | [packages/evals/src/committer.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L58) |
| <a id="property-reportid"></a> `reportId` | `string` | The emitting sweep report; every claim's gate references it. | [packages/evals/src/committer.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/committer.ts#L60) |
