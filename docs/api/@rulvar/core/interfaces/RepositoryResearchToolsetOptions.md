[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RepositoryResearchToolsetOptions

# Interface: RepositoryResearchToolsetOptions

Defined in: [packages/core/src/tools/research.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L45)

## Extended by

- [`ResearchAgentProfileOptions`](/api/@rulvar/core/interfaces/ResearchAgentProfileOptions.md)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-ignore"></a> `ignore?` | `string`[] | Extra ignored basenames (files and directories), merged over the always-on defaults '.git' and 'node_modules'. | [packages/core/src/tools/research.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L60) |
| <a id="property-includehidden"></a> `includeHidden?` | `boolean` | Walk dot-entries too; default false. | [packages/core/src/tools/research.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L62) |
| <a id="property-maxfilebytes"></a> `maxFileBytes?` | `number` | Files larger than this many bytes are refused; default 262144. | [packages/core/src/tools/research.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L53) |
| <a id="property-maxscannedfiles"></a> `maxScannedFiles?` | `number` | Walk ceiling per call (files visited); default 20000. | [packages/core/src/tools/research.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L55) |
| <a id="property-pagesize"></a> `pageSize?` | `number` | Rows per list/search/evidence page; default 50. | [packages/core/src/tools/research.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L49) |
| <a id="property-readpagechars"></a> `readPageChars?` | `number` | Content budget of one read_file page in characters; default 4000. | [packages/core/src/tools/research.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L51) |
| <a id="property-root"></a> `root` | `string` | The confining directory root; everything resolves under it. | [packages/core/src/tools/research.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/research.ts#L47) |
