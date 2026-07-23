[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RepositoryResearchToolsetOptions

# Interface: RepositoryResearchToolsetOptions

Defined in: [packages/core/src/tools/research.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L42)

## Extended by

- [`ResearchAgentProfileOptions`](/api/@rulvar/core/interfaces/ResearchAgentProfileOptions.md)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-ignore"></a> `ignore?` | `string`[] | Extra ignored basenames (files and directories), merged over the always-on defaults '.git' and 'node_modules'. | [packages/core/src/tools/research.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L57) |
| <a id="property-includehidden"></a> `includeHidden?` | `boolean` | Walk dot-entries too; default false. | [packages/core/src/tools/research.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L59) |
| <a id="property-maxfilebytes"></a> `maxFileBytes?` | `number` | Files larger than this many bytes are refused; default 262144. | [packages/core/src/tools/research.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L50) |
| <a id="property-maxscannedfiles"></a> `maxScannedFiles?` | `number` | Walk ceiling per call (files visited); default 20000. | [packages/core/src/tools/research.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L52) |
| <a id="property-pagesize"></a> `pageSize?` | `number` | Rows per list/search/evidence page; default 50. | [packages/core/src/tools/research.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L46) |
| <a id="property-readpagechars"></a> `readPageChars?` | `number` | Content budget of one read_file page in characters; default 4000. | [packages/core/src/tools/research.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L48) |
| <a id="property-root"></a> `root` | `string` | The confining directory root; everything resolves under it. | [packages/core/src/tools/research.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L44) |
