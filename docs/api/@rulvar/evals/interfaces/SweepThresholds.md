[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / SweepThresholds

# Interface: SweepThresholds

Defined in: [packages/evals/src/sweeps.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L49)

The claim bands. Both effective values must be finite fractions in
[0, 1] with weakness strictly below strength (so the bands are
ordered and an uninformative mid band exists); runSweepMatrix
rejects anything else with a ConfigError before any engine, store,
or envelope activity.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-strength"></a> `strength` | `number` | passRate at or above emits a strength claim; default 0.9. | [packages/evals/src/sweeps.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L51) |
| <a id="property-weakness"></a> `weakness` | `number` | passRate at or below emits a weakness claim; default 0.5. | [packages/evals/src/sweeps.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L53) |
