[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / RunSweepOptions

# Interface: RunSweepOptions

Defined in: [packages/evals/src/sweeps.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L49)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-committerid"></a> `committerId` | `string` | The dedicated committer identity. | [packages/evals/src/sweeps.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L53) |
| <a id="property-enginefor"></a> `engineFor` | (`member`) => \| [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md) \| `Promise`\&lt;[`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md)\&gt; | A fresh engine per model cell, routed at that member: the caller owns adapters, budgets, and the VCR posture, so a sweep records and replays like any engine run. | [packages/evals/src/sweeps.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L61) |
| <a id="property-envelope"></a> `envelope?` | [`SpendEnvelope`](/api/@rulvar/evals/classes/SpendEnvelope.md) | Aggregate debit-only envelope over the WHOLE matrix (v1.16.2 review P1-2): every target and judge run authorizes its immutable ceiling before starting, so the pool times cases times judge-call product cannot exceed it, falsification pool growth included. An envelope requires suite.budgetUsd (and suite.judgeBudgetUsd once a grader judges); a cell refused by the envelope lands in the report as envelopeExhausted with NO claim. Share the instance with the canary loop so probes draw from the same remainder. | [packages/evals/src/sweeps.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L76) |
| <a id="property-modelepochfor"></a> `modelEpochFor?` | (`member`) => \| \{ `canaryFingerprint?`: `string`; `capsHash?`: `string`; `pricingVersion?`: `string`; `registryVersion?`: `string`; \} \| `undefined` | Optional epoch stamp per pool member (capture via the core modelEpochOf; the canary fingerprint rides it when probes ran). | [packages/evals/src/sweeps.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L83) |
| <a id="property-observedat"></a> `observedAt` | `string` | ISO date of the sweep; the TTL table applies from it (no wall clock inside). | [packages/evals/src/sweeps.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L55) |
| <a id="property-reportid"></a> `reportId` | `string` | Deterministic, caller-minted; every claim's evidence and gate reference it. | [packages/evals/src/sweeps.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L51) |
| <a id="property-store"></a> `store?` | [`ModelKnowledgeStore`](/api/@rulvar/rulvar/interfaces/ModelKnowledgeStore.md) | When given, emitted claims commit through the committer identity. | [packages/evals/src/sweeps.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L78) |
| <a id="property-suite"></a> `suite?` | [`RunEvalSuiteOptions`](/api/@rulvar/evals/interfaces/RunEvalSuiteOptions.md) | Passed through to every suite run (budget, VCR hooks ride the engine). | [packages/evals/src/sweeps.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L65) |
| <a id="property-thresholds"></a> `thresholds?` | `Partial`\&lt;[`SweepThresholds`](/api/@rulvar/evals/interfaces/SweepThresholds.md)\&gt; | Mid-band pass rates emit NO claim (uninformative); see defaults. | [packages/evals/src/sweeps.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/sweeps.ts#L63) |
