[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RepositoryResearchToolset

# Interface: RepositoryResearchToolset

Defined in: [packages/core/src/tools/research.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L73)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-tools"></a> `tools` | [`ToolDef`](/api/@rulvar/core/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md)\&gt;[] | list_files, search_files, read_file, record_evidence, list_evidence. | [packages/core/src/tools/research.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L75) |

## Methods

### evidence()

```ts
evidence(): ResearchEvidenceEntry[];
```

Defined in: [packages/core/src/tools/research.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L77)

Snapshot copy of the evidence collected so far, in record order.

#### Returns

[`ResearchEvidenceEntry`](/api/@rulvar/core/interfaces/ResearchEvidenceEntry.md)[]
