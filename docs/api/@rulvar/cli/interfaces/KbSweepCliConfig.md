[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / KbSweepCliConfig

# Interface: KbSweepCliConfig

Defined in: [packages/cli/src/config.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L67)

The kb sweep config: a FIXED pool (sweep volume is never authorized
by proposal volume) plus the cases per taskClass. Structural sweep
shapes only: the CLI's static dependency stays @rulvar/core and
@rulvar/evals loads dynamically at command time (the plan-command
precedent), so graders and cases are typed by the config module.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-allowunbounded"></a> `allowUnbounded?` | `boolean` | Explicitly waive the ceilings and run every target, judge, and canary run unbounded (the pre-v1.16.2 behavior). A sweep with neither budgets nor this flag set fails loudly: an unbounded paid matrix is never the silent default. | [packages/cli/src/config.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L108) |
| <a id="property-budgets"></a> `budgets?` | \{ `canaryUsd`: `number`; `judgeUsd`: `number`; `maxTotalUsd`: `number`; `targetUsd`: `number`; \} | Immutable per-run ceilings and the aggregate debit-only envelope (v1.16.2 review P1-2). A sweep multiplies paid runs: pool members times cases for targets, one judge run per judge-grader call, one canary run per probe per member, and the falsification union can grow the pool past the configured models. Per-run ceilings alone do not bound that product, so maxTotalUsd is the hard aggregate ceiling every target, judge, and canary run authorizes against BEFORE it starts. Required unless allowUnbounded is set: a sweep is never silently unbounded. | [packages/cli/src/config.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L92) |
| `budgets.canaryUsd` | `number` | Immutable ceiling of every canary probe run. | [packages/cli/src/config.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L98) |
| `budgets.judgeUsd` | `number` | Immutable ceiling of every judge run. | [packages/cli/src/config.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L96) |
| `budgets.maxTotalUsd` | `number` | The debit-only envelope over the WHOLE sweep (targets, judges, canary). | [packages/cli/src/config.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L100) |
| `budgets.targetUsd` | `number` | Immutable ceiling B0 of every eval target run. | [packages/cli/src/config.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L94) |
| <a id="property-canary"></a> `canary?` | \{ `agentType`: `string`; `prompts`: `string`[]; \} | Optional canary probes run per pool member BEFORE the sweep; drift flips stale. | [packages/cli/src/config.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L76) |
| `canary.agentType` | `string` | - | [packages/cli/src/config.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L76) |
| `canary.prompts` | `string`[] | - | [packages/cli/src/config.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L76) |
| <a id="property-cases"></a> `cases` | \{ `case`: `unknown`; `taskClass`: `string`; \}[] | Eval cases tagged by taskClass (constructed with @rulvar/evals inside the config module). | [packages/cli/src/config.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L73) |
| <a id="property-committerid"></a> `committerId` | `string` | The dedicated committer identity recorded on gates and authors. | [packages/cli/src/config.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L69) |
| <a id="property-enginefor"></a> `engineFor?` | (`member`) => `unknown` | Per-member engine override; default: engineOptions with loop/extract routed at the member. | [packages/cli/src/config.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L80) |
| <a id="property-models"></a> `models` | \{ `effort?`: `string`; `model`: `` `${string}:${string}` ``; \}[] | The fixed pool; falsification UNIONS in the store's negative-claim and re-measure subjects. | [packages/cli/src/config.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L71) |
| <a id="property-reportid"></a> `reportId?` | `string` | Default: kb-sweep-&lt;observedAt ISO&gt;. | [packages/cli/src/config.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L78) |
| <a id="property-thresholds"></a> `thresholds?` | \{ `strength?`: `number`; `weakness?`: `number`; \} | - | [packages/cli/src/config.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L74) |
| `thresholds.strength?` | `number` | - | [packages/cli/src/config.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L74) |
| `thresholds.weakness?` | `number` | - | [packages/cli/src/config.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/config.ts#L74) |
