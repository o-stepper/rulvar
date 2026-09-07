[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ResearchFanOutOptions

# Interface: ResearchFanOutOptions

Defined in: `packages/core/dist/index.d.ts`

Options of [researchFanOut](/api/@rulvar/rulvar/functions/researchFanOut.md): the research template's plus the money and the roster.

## Extends

- [`ResearchAgentProfileOptions`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md)

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-budgetusd"></a> `budgetUsd` | `number` | The declared money per child, in USD: the profile's `estCost`, the extension's headroom floor (a tenth of it), and the figure the acceptance's limit profile measures spend against. | - | `packages/core/dist/index.d.ts` |
| <a id="property-children"></a> `children?` | `number` | Children the acceptance requires spawned; absent leaves the roster floor off. | - | `packages/core/dist/index.d.ts` |
| <a id="property-description"></a> `description?` | `string` | Advertised profile description; the template provides a default. | [`ResearchAgentProfileOptions`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md).[`description`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md#property-description) | `packages/core/dist/index.d.ts` |
| <a id="property-evidencecontract"></a> `evidenceContract?` | [`EvidenceContract`](/api/@rulvar/rulvar/interfaces/EvidenceContract.md) | The declared evidence floor of the task (RV303), passed through to [AgentProfile.evidenceContract](/api/@rulvar/rulvar/interfaces/AgentProfile.md#property-evidencecontract) so preflight can compare it against the profile's tool budget and warn `tool-cap-below-evidence-floor` before any paid call. | [`ResearchAgentProfileOptions`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md).[`evidenceContract`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md#property-evidencecontract) | `packages/core/dist/index.d.ts` |
| <a id="property-extratools"></a> `extraTools?` | [`ToolDef`](/api/@rulvar/rulvar/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt;\&gt;[] | Extra tools appended after the research toolset. | [`ResearchAgentProfileOptions`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md).[`extraTools`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md#property-extratools) | `packages/core/dist/index.d.ts` |
| <a id="property-ignore"></a> `ignore?` | `string`[] | Extra ignored basenames (files and directories), merged over the always-on defaults '.git' and 'node_modules'. | [`ResearchAgentProfileOptions`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md).[`ignore`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md#property-ignore) | `packages/core/dist/index.d.ts` |
| <a id="property-includehidden"></a> `includeHidden?` | `boolean` | Walk dot-entries too; default false. | [`ResearchAgentProfileOptions`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md).[`includeHidden`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md#property-includehidden) | `packages/core/dist/index.d.ts` |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md) | Per-key overrides over [RESEARCH\_PROFILE\_LIMITS](/api/@rulvar/rulvar/variables/RESEARCH_PROFILE_LIMITS.md). | [`ResearchAgentProfileOptions`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md).[`limits`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md#property-limits) | `packages/core/dist/index.d.ts` |
| <a id="property-maxfilebytes"></a> `maxFileBytes?` | `number` | Files larger than this many bytes are refused; default 262144. | [`ResearchAgentProfileOptions`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md).[`maxFileBytes`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md#property-maxfilebytes) | `packages/core/dist/index.d.ts` |
| <a id="property-maxscannedfiles"></a> `maxScannedFiles?` | `number` | Walk ceiling per call (files visited); default 20000. | [`ResearchAgentProfileOptions`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md).[`maxScannedFiles`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md#property-maxscannedfiles) | `packages/core/dist/index.d.ts` |
| <a id="property-minterminaloutputchars"></a> `minTerminalOutputChars?` | `number` | The character floor a limit child's terminal output must clear to be salvaged. | - | `packages/core/dist/index.d.ts` |
| <a id="property-pagesize"></a> `pageSize?` | `number` | Rows per list/search/evidence page; default 50. | [`ResearchAgentProfileOptions`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md).[`pageSize`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md#property-pagesize) | `packages/core/dist/index.d.ts` |
| <a id="property-readpagechars"></a> `readPageChars?` | `number` | Content budget of one read_file page in characters; default 4000. | [`ResearchAgentProfileOptions`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md).[`readPageChars`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md#property-readpagechars) | `packages/core/dist/index.d.ts` |
| <a id="property-root"></a> `root` | `string` | The confining directory root; everything resolves under it. | [`ResearchAgentProfileOptions`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md).[`root`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileOptions.md#property-root) | `packages/core/dist/index.d.ts` |
| <a id="property-summarymaxoutputtokens"></a> `summaryMaxOutputTokens?` | `number` | The finalization reserve summary allowance; default 8000. | - | `packages/core/dist/index.d.ts` |
