[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ScopePolicy

# Interface: ScopePolicy

Defined in: [packages/core/src/engine/engine.ts:848](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L848)

What an UNKNOWN scope field does (RV4205). 'drop' (the default, the
RV4007/RV4107 posture byte for byte) silently discards it from the
normalized copy, which keeps junk fields from moving the recorded
identity; 'reject' refuses it typed by name, because a dimension
the engine cannot record is a dimension nothing downstream can bind
to routing, quota, or audit, and a host that declared it meant it.
`compileRegulatedProfile` enforces 'reject'.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-unknown"></a> `unknown?` | `"reject"` \| `"drop"` | [packages/core/src/engine/engine.ts:849](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L849) |
