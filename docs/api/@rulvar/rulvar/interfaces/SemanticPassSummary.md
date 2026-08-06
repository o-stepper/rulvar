[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SemanticPassSummary

# Interface: SemanticPassSummary

Defined in: `packages/core/dist/index.d.ts`

One semantic pass's explicit summary (RV1906): `ran: true` means the
pass executed (its findings and meta fields carry the details);
`ran: false` names WHY in `reason` ('not-configured', 'run-rejected',
'valid-draft', 'not-run'), so an absent findings field can never be
read as a clean pass. The four-role benchmark's artifacts carried
`contradictions: null` and `claimConsistencyMeta: null`, and the
judge had to annotate by hand that null meant NOT RUN.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-ran"></a> `ran` | `boolean` | `packages/core/dist/index.d.ts` |
| <a id="property-reason"></a> `reason?` | `string` | `packages/core/dist/index.d.ts` |
