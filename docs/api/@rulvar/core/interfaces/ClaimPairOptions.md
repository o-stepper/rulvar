[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ClaimPairOptions

# Interface: ClaimPairOptions

Defined in: [packages/core/src/orchestrator/consistency.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L66)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-max"></a> `max?` | `number` | Bound on returned pairs; default [DEFAULT\_MAX\_CLAIM\_PAIRS](/api/@rulvar/core/variables/DEFAULT_MAX_CLAIM_PAIRS.md). | [packages/core/src/orchestrator/consistency.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L70) |
| <a id="property-maxexcerptchars"></a> `maxExcerptChars?` | `number` | Bound on each excerpt; default [DEFAULT\_MAX\_PAIR\_EXCERPT\_CHARS](/api/@rulvar/core/variables/DEFAULT_MAX_PAIR_EXCERPT_CHARS.md). | [packages/core/src/orchestrator/consistency.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L74) |
| <a id="property-maxpoolperpair"></a> `maxPoolPerPair?` | `number` | Bound on each pair's pool readings; default [DEFAULT\_MAX\_POOL\_PER\_PAIR](/api/@rulvar/core/variables/DEFAULT_MAX_POOL_PER_PAIR.md). | [packages/core/src/orchestrator/consistency.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L72) |
| <a id="property-pattern"></a> `pattern?` | `string` | Overrides [DEFAULT\_ANCHOR\_PATTERN](/api/@rulvar/core/variables/DEFAULT_ANCHOR_PATTERN.md) for both sides. | [packages/core/src/orchestrator/consistency.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L68) |
