[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResearchAgentProfileOptions

# Interface: ResearchAgentProfileOptions

Defined in: [packages/core/src/engine/profile-templates.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/profile-templates.ts#L85)

Options of [researchAgentProfile](/api/@rulvar/core/functions/researchAgentProfile.md): the toolset knobs plus template overrides.

## Extends

- [`RepositoryResearchToolsetOptions`](/api/@rulvar/core/interfaces/RepositoryResearchToolsetOptions.md)

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-description"></a> `description?` | `string` | Advertised profile description; the template provides a default. | - | [packages/core/src/engine/profile-templates.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/profile-templates.ts#L87) |
| <a id="property-extratools"></a> `extraTools?` | [`ToolDef`](/api/@rulvar/core/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md)\&gt;[] | Extra tools appended after the research toolset. | - | [packages/core/src/engine/profile-templates.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/profile-templates.ts#L91) |
| <a id="property-ignore"></a> `ignore?` | `string`[] | Extra ignored basenames (files and directories), merged over the always-on defaults '.git' and 'node_modules'. | [`RepositoryResearchToolsetOptions`](/api/@rulvar/core/interfaces/RepositoryResearchToolsetOptions.md).[`ignore`](/api/@rulvar/core/interfaces/RepositoryResearchToolsetOptions.md#property-ignore) | [packages/core/src/tools/research.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L57) |
| <a id="property-includehidden"></a> `includeHidden?` | `boolean` | Walk dot-entries too; default false. | [`RepositoryResearchToolsetOptions`](/api/@rulvar/core/interfaces/RepositoryResearchToolsetOptions.md).[`includeHidden`](/api/@rulvar/core/interfaces/RepositoryResearchToolsetOptions.md#property-includehidden) | [packages/core/src/tools/research.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L59) |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | Per-key overrides over [RESEARCH\_PROFILE\_LIMITS](/api/@rulvar/core/variables/RESEARCH_PROFILE_LIMITS.md). | - | [packages/core/src/engine/profile-templates.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/profile-templates.ts#L89) |
| <a id="property-maxfilebytes"></a> `maxFileBytes?` | `number` | Files larger than this many bytes are refused; default 262144. | [`RepositoryResearchToolsetOptions`](/api/@rulvar/core/interfaces/RepositoryResearchToolsetOptions.md).[`maxFileBytes`](/api/@rulvar/core/interfaces/RepositoryResearchToolsetOptions.md#property-maxfilebytes) | [packages/core/src/tools/research.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L50) |
| <a id="property-maxscannedfiles"></a> `maxScannedFiles?` | `number` | Walk ceiling per call (files visited); default 20000. | [`RepositoryResearchToolsetOptions`](/api/@rulvar/core/interfaces/RepositoryResearchToolsetOptions.md).[`maxScannedFiles`](/api/@rulvar/core/interfaces/RepositoryResearchToolsetOptions.md#property-maxscannedfiles) | [packages/core/src/tools/research.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L52) |
| <a id="property-pagesize"></a> `pageSize?` | `number` | Rows per list/search/evidence page; default 50. | [`RepositoryResearchToolsetOptions`](/api/@rulvar/core/interfaces/RepositoryResearchToolsetOptions.md).[`pageSize`](/api/@rulvar/core/interfaces/RepositoryResearchToolsetOptions.md#property-pagesize) | [packages/core/src/tools/research.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L46) |
| <a id="property-readpagechars"></a> `readPageChars?` | `number` | Content budget of one read_file page in characters; default 4000. | [`RepositoryResearchToolsetOptions`](/api/@rulvar/core/interfaces/RepositoryResearchToolsetOptions.md).[`readPageChars`](/api/@rulvar/core/interfaces/RepositoryResearchToolsetOptions.md#property-readpagechars) | [packages/core/src/tools/research.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L48) |
| <a id="property-root"></a> `root` | `string` | The confining directory root; everything resolves under it. | [`RepositoryResearchToolsetOptions`](/api/@rulvar/core/interfaces/RepositoryResearchToolsetOptions.md).[`root`](/api/@rulvar/core/interfaces/RepositoryResearchToolsetOptions.md#property-root) | [packages/core/src/tools/research.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L44) |
