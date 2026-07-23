[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ResearchAgentProfileOptions

# Interface: ResearchAgentProfileOptions

Defined in: `packages/core/dist/index.d.ts`

Options of [researchAgentProfile](/api/@rulvar/rulvar/functions/researchAgentProfile.md): the toolset knobs plus template overrides.

## Extends

- [`RepositoryResearchToolsetOptions`](/api/@rulvar/rulvar/interfaces/RepositoryResearchToolsetOptions.md)

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-description"></a> `description?` | `string` | Advertised profile description; the template provides a default. | - | `packages/core/dist/index.d.ts` |
| <a id="property-extratools"></a> `extraTools?` | [`ToolDef`](/api/@rulvar/rulvar/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt;\&gt;[] | Extra tools appended after the research toolset. | - | `packages/core/dist/index.d.ts` |
| <a id="property-ignore"></a> `ignore?` | `string`[] | Extra ignored basenames (files and directories), merged over the always-on defaults '.git' and 'node_modules'. | [`RepositoryResearchToolsetOptions`](/api/@rulvar/rulvar/interfaces/RepositoryResearchToolsetOptions.md).[`ignore`](/api/@rulvar/rulvar/interfaces/RepositoryResearchToolsetOptions.md#property-ignore) | `packages/core/dist/index.d.ts` |
| <a id="property-includehidden"></a> `includeHidden?` | `boolean` | Walk dot-entries too; default false. | [`RepositoryResearchToolsetOptions`](/api/@rulvar/rulvar/interfaces/RepositoryResearchToolsetOptions.md).[`includeHidden`](/api/@rulvar/rulvar/interfaces/RepositoryResearchToolsetOptions.md#property-includehidden) | `packages/core/dist/index.d.ts` |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md) | Per-key overrides over [RESEARCH\_PROFILE\_LIMITS](/api/@rulvar/rulvar/variables/RESEARCH_PROFILE_LIMITS.md). | - | `packages/core/dist/index.d.ts` |
| <a id="property-maxfilebytes"></a> `maxFileBytes?` | `number` | Files larger than this many bytes are refused; default 262144. | [`RepositoryResearchToolsetOptions`](/api/@rulvar/rulvar/interfaces/RepositoryResearchToolsetOptions.md).[`maxFileBytes`](/api/@rulvar/rulvar/interfaces/RepositoryResearchToolsetOptions.md#property-maxfilebytes) | `packages/core/dist/index.d.ts` |
| <a id="property-maxscannedfiles"></a> `maxScannedFiles?` | `number` | Walk ceiling per call (files visited); default 20000. | [`RepositoryResearchToolsetOptions`](/api/@rulvar/rulvar/interfaces/RepositoryResearchToolsetOptions.md).[`maxScannedFiles`](/api/@rulvar/rulvar/interfaces/RepositoryResearchToolsetOptions.md#property-maxscannedfiles) | `packages/core/dist/index.d.ts` |
| <a id="property-pagesize"></a> `pageSize?` | `number` | Rows per list/search/evidence page; default 50. | [`RepositoryResearchToolsetOptions`](/api/@rulvar/rulvar/interfaces/RepositoryResearchToolsetOptions.md).[`pageSize`](/api/@rulvar/rulvar/interfaces/RepositoryResearchToolsetOptions.md#property-pagesize) | `packages/core/dist/index.d.ts` |
| <a id="property-readpagechars"></a> `readPageChars?` | `number` | Content budget of one read_file page in characters; default 4000. | [`RepositoryResearchToolsetOptions`](/api/@rulvar/rulvar/interfaces/RepositoryResearchToolsetOptions.md).[`readPageChars`](/api/@rulvar/rulvar/interfaces/RepositoryResearchToolsetOptions.md#property-readpagechars) | `packages/core/dist/index.d.ts` |
| <a id="property-root"></a> `root` | `string` | The confining directory root; everything resolves under it. | [`RepositoryResearchToolsetOptions`](/api/@rulvar/rulvar/interfaces/RepositoryResearchToolsetOptions.md).[`root`](/api/@rulvar/rulvar/interfaces/RepositoryResearchToolsetOptions.md#property-root) | `packages/core/dist/index.d.ts` |
