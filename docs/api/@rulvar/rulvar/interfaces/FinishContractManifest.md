[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / FinishContractManifest

# Interface: FinishContractManifest

Defined in: `packages/core/dist/index.d.ts`

The single source of truth of a textual finish contract: what the
prompt promises IS what the validators enforce. Declare only textual
demands here (sections, length, citations); an object-shaped result
belongs to [requiredSectionsValidator](/api/@rulvar/rulvar/functions/requiredSectionsValidator.md)'s sibling
requiredFieldsValidator and a host-provided selfTest accept fixture.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-citations"></a> `citations?` | [`FinishContractCitations`](/api/@rulvar/rulvar/interfaces/FinishContractCitations.md) | Citation demands over the result text. | `packages/core/dist/index.d.ts` |
| <a id="property-fencedcode"></a> `fencedCode?` | [`FencedCodeMode`](/api/@rulvar/rulvar/type-aliases/FencedCodeMode.md) | Whether fenced code blocks count (cycle 74): 'counted' (the default) or 'excluded' (fenced code is removed before section matching, slicing, word counting, and citation matching, so code samples can neither satisfy a marker nor pad a count). Joins the hash and adds a prompt statement only when 'excluded'; an explicit 'counted' normalizes away. With 'excluded', a section marker or a citation sample that would itself OPEN a fence is a ConfigError, because the golden fixtures embed both at line starts. | `packages/core/dist/index.d.ts` |
| <a id="property-sectionpatterns"></a> `sectionPatterns?` | [`FinishContractSectionPattern`](/api/@rulvar/rulvar/interfaces/FinishContractSectionPattern.md)[] | Counted collections inside named sections (RV2206): each entry demands at least `min` matches of `pattern` inside `section`'s slice, DISTINCT by first capture when the pattern captures. Requires `sections`. The `samples` are literal matches embedded in the golden fixtures and quoted by the prompt: with a capturing pattern they must carry at least `min` DISTINCT captures, because the accept skeleton must itself satisfy the demand. | `packages/core/dist/index.d.ts` |
| <a id="property-sections"></a> `sections?` | `string`[] | Literal section markers the result must contain. | `packages/core/dist/index.d.ts` |
| <a id="property-sectionsmatch"></a> `sectionsMatch?` | [`SectionMatchMode`](/api/@rulvar/rulvar/type-aliases/SectionMatchMode.md) | How section markers must appear (cycle 74): 'anywhere' (the default, a plain substring test) or 'line' (each marker must stand as its own line, surrounding whitespace ignored, so a mid sentence mention no longer satisfies a heading). Requires `sections`. Joins the hash and the prompt statement only when 'line'; an explicit 'anywhere' normalizes away, keeping the hash of the plain manifest. | `packages/core/dist/index.d.ts` |
| <a id="property-words"></a> `words?` | \{ `max?`: `number`; `min?`: `number`; \} | Word bounds over the result text (whitespace separated tokens). | `packages/core/dist/index.d.ts` |
| `words.max?` | `number` | - | `packages/core/dist/index.d.ts` |
| `words.min?` | `number` | - | `packages/core/dist/index.d.ts` |
