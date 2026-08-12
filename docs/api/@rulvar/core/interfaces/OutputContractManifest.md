[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OutputContractManifest

# Interface: OutputContractManifest

Defined in: [packages/core/src/orchestrator/finish-validators.ts:1711](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L1711)

One declaration for the shape a host both PROMPTS for and GATES on
(RV3308). The 2026-08-12 comparison run drifted exactly here: the
harness prompt named one heading while its finish contract named an
older one, the host accepted its own contract, and the common audit
refused the answer. A manifest is read twice, by
[manifestValidators](/api/@rulvar/core/functions/manifestValidators.md) to build the gate and by
[renderContractRequirements](/api/@rulvar/core/functions/renderContractRequirements.md) to build the prompt block, so
the two surfaces cannot disagree by construction.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-citationpattern"></a> `citationPattern?` | `string` | Overrides the citation shape; only meaningful beside `minCitations`. | [packages/core/src/orchestrator/finish-validators.ts:1721](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L1721) |
| <a id="property-mincitations"></a> `minCitations?` | `number` | Minimum citation occurrences over [DEFAULT\_CITATION\_PATTERN](/api/@rulvar/core/variables/DEFAULT_CITATION_PATTERN.md) or `citationPattern`. | [packages/core/src/orchestrator/finish-validators.ts:1719](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L1719) |
| <a id="property-requiredmentions"></a> `requiredMentions?` | readonly `string`[] | Literal strings the result must contain, each at least once. | [packages/core/src/orchestrator/finish-validators.ts:1715](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L1715) |
| <a id="property-sections"></a> `sections?` | readonly `string`[] | The exact heading lines, ordered and exclusive when present. | [packages/core/src/orchestrator/finish-validators.ts:1713](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L1713) |
| <a id="property-words"></a> `words?` | \{ `max?`: `number`; `min?`: `number`; \} | Whitespace word bounds, either side optional. | [packages/core/src/orchestrator/finish-validators.ts:1717](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L1717) |
| `words.max?` | `number` | - | [packages/core/src/orchestrator/finish-validators.ts:1717](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L1717) |
| `words.min?` | `number` | - | [packages/core/src/orchestrator/finish-validators.ts:1717](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L1717) |
