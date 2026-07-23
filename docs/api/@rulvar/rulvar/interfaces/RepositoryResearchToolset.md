[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RepositoryResearchToolset

# Interface: RepositoryResearchToolset

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-tools"></a> `tools` | [`ToolDef`](/api/@rulvar/rulvar/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt;\&gt;[] | list_files, search_files, read_file, record_evidence, list_evidence. | `packages/core/dist/index.d.ts` |

## Methods

### evidence()

```ts
evidence(): ResearchEvidenceEntry[];
```

Defined in: `packages/core/dist/index.d.ts`

Snapshot copy of the evidence collected so far, in record order.

#### Returns

[`ResearchEvidenceEntry`](/api/@rulvar/rulvar/interfaces/ResearchEvidenceEntry.md)[]
