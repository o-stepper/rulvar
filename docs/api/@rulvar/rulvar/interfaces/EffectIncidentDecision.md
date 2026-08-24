[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EffectIncidentDecision

# Interface: EffectIncidentDecision

Defined in: `packages/core/dist/index.d.ts`

A linked incident (RFC section 4.6, item 2): a fact that arrived
after a terminal and genuinely matters. Durable, causally linked,
surfaced, requiring disposition; never a mutation of the terminal.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-causalref"></a> `causalRef?` | `number` | `packages/core/dist/index.d.ts` |
| <a id="property-decisiontype"></a> `decisionType` | `"effect_incident"` | `packages/core/dist/index.d.ts` |
| <a id="property-detail"></a> `detail?` | `string` | `packages/core/dist/index.d.ts` |
| <a id="property-incident"></a> `incident` | `string` | `packages/core/dist/index.d.ts` |
| <a id="property-intentref"></a> `intentRef` | `number` | `packages/core/dist/index.d.ts` |
| <a id="property-opid"></a> `opId` | `string` | `packages/core/dist/index.d.ts` |
