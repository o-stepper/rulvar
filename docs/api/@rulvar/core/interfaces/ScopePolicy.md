[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ScopePolicy

# Interface: ScopePolicy

Defined in: [packages/core/src/engine/engine.ts:898](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L898)

What an UNKNOWN scope field does (RV4205). 'drop' (the default, the
RV4007/RV4107 posture byte for byte) silently discards it from the
normalized copy, which keeps junk fields from moving the recorded
identity; 'reject' refuses it typed by name, because a dimension
the engine cannot record is a dimension nothing downstream can bind
to routing, quota, or audit, and a host that declared it meant it.
`compileRegulatedProfile` enforces 'reject'. `normalize` (RV4302)
canonicalizes VALUES before the identity exists anywhere: the table
is journaled in the genesis `execution_scope` decision and mirrored
in RunMeta, and resume reads the RECORDED table, never a re-supplied
one (a conflicting resupply refuses typed, the args-binding rule).

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-normalize"></a> `normalize?` | [`ScopeNormalizeTable`](/api/@rulvar/core/interfaces/ScopeNormalizeTable.md) | [packages/core/src/engine/engine.ts:900](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L900) |
| <a id="property-unknown"></a> `unknown?` | `"reject"` \| `"drop"` | [packages/core/src/engine/engine.ts:899](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L899) |
