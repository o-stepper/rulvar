[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / OutputContractManifest

# Interface: OutputContractManifest

Defined in: `packages/core/dist/index.d.ts`

One declaration for the shape a host both PROMPTS for and GATES on
(RV3308). The 2026-08-12 comparison run drifted exactly here: the
harness prompt named one heading while its finish contract named an
older one, the host accepted its own contract, and the common audit
refused the answer. A manifest is read twice, by
[manifestValidators](/api/@rulvar/rulvar/functions/manifestValidators.md) to build the gate and by
[renderContractRequirements](/api/@rulvar/rulvar/functions/renderContractRequirements.md) to build the prompt block, so
the two surfaces cannot disagree by construction.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-citationpattern"></a> `citationPattern?` | `string` | Overrides the citation shape; only meaningful beside `minCitations`. | `packages/core/dist/index.d.ts` |
| <a id="property-mincitations"></a> `minCitations?` | `number` | Minimum citation occurrences over [DEFAULT\_CITATION\_PATTERN](/api/@rulvar/rulvar/variables/DEFAULT_CITATION_PATTERN.md) or `citationPattern`. | `packages/core/dist/index.d.ts` |
| <a id="property-requiredmentions"></a> `requiredMentions?` | readonly `string`[] | Literal strings the result must contain, each at least once. | `packages/core/dist/index.d.ts` |
| <a id="property-sections"></a> `sections?` | readonly `string`[] | The exact heading lines, ordered and exclusive when present. | `packages/core/dist/index.d.ts` |
| <a id="property-words"></a> `words?` | \{ `max?`: `number`; `min?`: `number`; \} | Whitespace word bounds, either side optional. | `packages/core/dist/index.d.ts` |
| `words.max?` | `number` | - | `packages/core/dist/index.d.ts` |
| `words.min?` | `number` | - | `packages/core/dist/index.d.ts` |
