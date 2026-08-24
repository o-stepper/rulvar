[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EffectProbeDecision

# Interface: EffectProbeDecision

Defined in: `packages/core/dist/index.d.ts`

A journaled provider probe (plan 45 train five): every lookup and
every acceptance closure the recovery machinery performs is a
durable row, so the intent's lookup budget (RFC section 3.1) is
countable from the journal alone and survives a crash of the
probing process.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-acceptanceclosed"></a> `acceptanceClosed?` | `boolean` | True when the negative is provider-enforced final. | `packages/core/dist/index.d.ts` |
| <a id="property-decisiontype"></a> `decisionType` | `"effect_probe"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-found"></a> `found` | `boolean` | - | `packages/core/dist/index.d.ts` |
| <a id="property-intentref"></a> `intentRef` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-opid"></a> `opId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-probe"></a> `probe` | `"lookup"` \| `"close-acceptance"` | - | `packages/core/dist/index.d.ts` |
