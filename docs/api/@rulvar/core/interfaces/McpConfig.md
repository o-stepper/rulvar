[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / McpConfig

# Interface: McpConfig

Defined in: [packages/core/src/tools/mcp.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L23)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-allow"></a> `allow?` | `string`[] | Tool-name filter on ORIGINAL names; omitted = all. | [packages/core/src/tools/mcp.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L33) |
| <a id="property-approval"></a> `approval?` | `boolean` \| `Record`\&lt;`string`, `boolean`\&gt; | true = every imported tool needsApproval; record form is per name. | [packages/core/src/tools/mcp.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L39) |
| <a id="property-args"></a> `args?` | `string`[] | - | [packages/core/src/tools/mcp.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L27) |
| <a id="property-command"></a> `command?` | `string` | stdio: child process to spawn. | [packages/core/src/tools/mcp.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L26) |
| <a id="property-deny"></a> `deny?` | `string`[] | Deny wins over allow (pre-prefix names). | [packages/core/src/tools/mcp.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L35) |
| <a id="property-prefix"></a> `prefix?` | `string` | Namespaces imported names as `${prefix}_${name}` (docs/08 6.4). | [packages/core/src/tools/mcp.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L37) |
| <a id="property-risk"></a> `risk?` | `Record`\&lt;`string`, [`ToolRisk`](/api/@rulvar/core/type-aliases/ToolRisk.md)\&gt; | Host-supplied risk labels for imported tools (docs/08 6.2). | [packages/core/src/tools/mcp.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L41) |
| <a id="property-server"></a> `server?` | `unknown` | inprocess: in-memory server instance (anything with connect()). | [packages/core/src/tools/mcp.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L31) |
| <a id="property-transport"></a> `transport` | `"inprocess"` \| `"stdio"` \| `"streamable-http"` | - | [packages/core/src/tools/mcp.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L24) |
| <a id="property-url"></a> `url?` | `string` | streamable-http: server endpoint. | [packages/core/src/tools/mcp.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L29) |
