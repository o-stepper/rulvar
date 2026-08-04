[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ClaimPairOptions

# Interface: ClaimPairOptions

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-critical"></a> `critical?` | readonly `string`[] | Critical anchor declarations (RV1603): each entry is a path (`packages/executor/src/ledger.ts`, matching that file and anything under it as a directory) or an anchor with a span (`src/exec.ts:250-300`, matching same-file anchors intersecting the span). Pairs whose draft anchor matches sort FIRST, before the `max` cap applies, so a bounded pass judges the declared claims preferentially; the fold also reports which critical draft anchors ended up with no reported pair. Unset = the exact pre-RV1603 ordering, byte for byte (the eighteenth comparison benchmark's judge saw 40 of 144 citing sentences with nothing steering WHICH 40). | `packages/core/dist/index.d.ts` |
| <a id="property-max"></a> `max?` | `number` | Bound on returned pairs; default [DEFAULT\_MAX\_CLAIM\_PAIRS](/api/@rulvar/rulvar/variables/DEFAULT_MAX_CLAIM_PAIRS.md). | `packages/core/dist/index.d.ts` |
| <a id="property-maxexcerptchars"></a> `maxExcerptChars?` | `number` | Bound on each excerpt; default [DEFAULT\_MAX\_PAIR\_EXCERPT\_CHARS](/api/@rulvar/rulvar/variables/DEFAULT_MAX_PAIR_EXCERPT_CHARS.md). | `packages/core/dist/index.d.ts` |
| <a id="property-maxpoolperpair"></a> `maxPoolPerPair?` | `number` | Bound on each pair's pool readings; default [DEFAULT\_MAX\_POOL\_PER\_PAIR](/api/@rulvar/rulvar/variables/DEFAULT_MAX_POOL_PER_PAIR.md). | `packages/core/dist/index.d.ts` |
| <a id="property-pattern"></a> `pattern?` | `string` | Overrides [DEFAULT\_ANCHOR\_PATTERN](/api/@rulvar/rulvar/variables/DEFAULT_ANCHOR_PATTERN.md) for both sides. | `packages/core/dist/index.d.ts` |
