[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / CanaryRunOptions

# Interface: CanaryRunOptions

Defined in: [packages/evals/src/canary.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L37)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-budgetusd"></a> `budgetUsd?` | `number` | Immutable ceiling per probe run (v1.16.2 review P1-2): every probe is an ordinary paid engine run and gets its own recorded RunMeta.budgetUsd. | [packages/evals/src/canary.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L43) |
| <a id="property-envelope"></a> `envelope?` | [`SpendEnvelope`](/api/@rulvar/evals/classes/SpendEnvelope.md) | Aggregate debit-only envelope shared with the surrounding sweep; each probe authorizes budgetUsd BEFORE running, and an envelope requires budgetUsd to be set. | [packages/evals/src/canary.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/canary.ts#L49) |
