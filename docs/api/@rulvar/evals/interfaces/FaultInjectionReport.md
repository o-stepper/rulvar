[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / FaultInjectionReport

# Interface: FaultInjectionReport

Defined in: [packages/evals/src/fault-injection.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/fault-injection.ts#L80)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-allmatched"></a> `allMatched` | `boolean` | Every scenario matched its documented observable. | [packages/evals/src/fault-injection.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/fault-injection.ts#L83) |
| <a id="property-artifactfiles"></a> `artifactFiles?` | `string`[] | The artifact files written, when `artifactsDir` was given. | [packages/evals/src/fault-injection.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/fault-injection.ts#L94) |
| <a id="property-requested"></a> `requested` | `number` | Scenarios the call asked for: the full registry size, or the `only` selection's length (RV1014). With `selected` beside it the report is self-describing: a consumer pinning these can never watch the gate quietly shrink. | [packages/evals/src/fault-injection.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/fault-injection.ts#L90) |
| <a id="property-scenarios"></a> `scenarios` | [`FaultScenarioReport`](/api/@rulvar/evals/interfaces/FaultScenarioReport.md)[] | - | [packages/evals/src/fault-injection.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/fault-injection.ts#L81) |
| <a id="property-selected"></a> `selected` | `number` | Scenarios actually run; always equals `requested` (the intake refuses misses). | [packages/evals/src/fault-injection.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/fault-injection.ts#L92) |
