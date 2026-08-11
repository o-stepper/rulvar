[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ClaimPairOptions

# Interface: ClaimPairOptions

Defined in: [packages/core/src/orchestrator/consistency.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L66)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-critical"></a> `critical?` | readonly `string`[] | Critical anchor declarations (RV1603): each entry is a path (`packages/executor/src/ledger.ts`, matching that file and anything under it as a directory) or an anchor with a span (`src/exec.ts:250-300`, matching same-file anchors intersecting the span). Pairs whose draft anchor matches sort FIRST, before the `max` cap applies, so a bounded pass judges the declared claims preferentially; the fold also reports which critical draft anchors ended up with no reported pair. Unset = the exact pre-RV1603 ordering, byte for byte (the eighteenth comparison benchmark's judge saw 40 of 144 citing sentences with nothing steering WHICH 40). | [packages/core/src/orchestrator/consistency.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L88) |
| <a id="property-max"></a> `max?` | `number` | Bound on returned pairs; default [DEFAULT\_MAX\_CLAIM\_PAIRS](/api/@rulvar/core/variables/DEFAULT_MAX_CLAIM_PAIRS.md). | [packages/core/src/orchestrator/consistency.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L70) |
| <a id="property-maxexcerptchars"></a> `maxExcerptChars?` | `number` | Bound on each excerpt; default [DEFAULT\_MAX\_PAIR\_EXCERPT\_CHARS](/api/@rulvar/core/variables/DEFAULT_MAX_PAIR_EXCERPT_CHARS.md). | [packages/core/src/orchestrator/consistency.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L74) |
| <a id="property-maxpoolperpair"></a> `maxPoolPerPair?` | `number` | Bound on each pair's pool readings; default [DEFAULT\_MAX\_POOL\_PER\_PAIR](/api/@rulvar/core/variables/DEFAULT_MAX_POOL_PER_PAIR.md). | [packages/core/src/orchestrator/consistency.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L72) |
| <a id="property-pattern"></a> `pattern?` | `string` | Overrides [DEFAULT\_ANCHOR\_PATTERN](/api/@rulvar/core/variables/DEFAULT_ANCHOR_PATTERN.md) for both sides. | [packages/core/src/orchestrator/consistency.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L68) |
| <a id="property-targetcoverageshare"></a> `targetCoverageShare?` | `number` | The declared coverage target (RV2903), in (0, 1]: size the reported pairs to COVER at least this share of the citing sentences instead of taking the first `max` pairs blind. The ninth comparison run judged 43 of 115 citing sentences because its host guessed `max: 56`, and nothing sized the pass to a goal. Under a target the selection is coverage-first: every critical candidate, then ONE candidate per still-uncovered sentence in draft order until the target is met; pairs that only deepen an already covered sentence are skipped, because under a declared target the bounded budget buys coverage, not depth. `max` stays a hard ceiling, and `truncated` then means exactly that the ceiling cut selection the target still wanted. Unset = the exact historical first-`max` selection, byte for byte. | [packages/core/src/orchestrator/consistency.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L104) |
