[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / acceptanceTailRequiredUsd

# Function: acceptanceTailRequiredUsd()

```ts
function acceptanceTailRequiredUsd(spec): {
  requiredUsd: number;
  terms: AcceptanceTailTerms;
};
```

Defined in: [packages/core/src/orchestrator/admission.ts:381](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L381)

The ONE acceptance-tail formula (RV4001, the fifth comparison
experiment): what the effective cap must cover, at exact fill or
better, so the acceptance machinery the host declared is funded and
not started on luck. The RV3907 runtime gate landed WITHOUT a
preflight twin: preflight kept its own advisory arithmetic on
different terms, passed the experiment's plan green at a $4.54 cap,
and the runtime then refused the same plan typed at $4.82 before the
first wire; worse, the runtime undercounted the judge passes of
`stage: 'both'` (one where the worst case dispatches two) while
preflight counted them right, so the two calculators disagreed in
BOTH directions. The gate and the preflight `acceptanceReserve`
report block now both call this function, exactly the
[dispatchProjectionReserveUsd](/api/@rulvar/core/functions/dispatchProjectionReserveUsd.md) precedent: one formula, so the
linter and the runtime cannot drift. Undeclared estimates contribute
zero: the tail binds exactly what the host declared. The armed
repair round (`onFound: 'repair'`, never at stage 'draft', which
intake refuses) adds one judge pass and one composition priced at
the declared `synthesis.estCost`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`AcceptanceTailSpec`](/api/@rulvar/core/interfaces/AcceptanceTailSpec.md) |

## Returns

```ts
{
  requiredUsd: number;
  terms: AcceptanceTailTerms;
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `requiredUsd` | `number` | [packages/core/src/orchestrator/admission.ts:382](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L382) |
| `terms` | [`AcceptanceTailTerms`](/api/@rulvar/core/interfaces/AcceptanceTailTerms.md) | [packages/core/src/orchestrator/admission.ts:383](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L383) |
