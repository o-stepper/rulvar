[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / McpConfig

# Interface: McpConfig

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-allow"></a> `allow?` | `string`[] | Tool-name filter on ORIGINAL names; omitted = all. | `packages/core/dist/index.d.ts` |
| <a id="property-approval"></a> `approval?` | `boolean` \| `Record`\&lt;`string`, `boolean`\&gt; | true = every imported tool needsApproval; record form is per name. | `packages/core/dist/index.d.ts` |
| <a id="property-args"></a> `args?` | `string`[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-command"></a> `command?` | `string` | stdio: child process to spawn. | `packages/core/dist/index.d.ts` |
| <a id="property-deny"></a> `deny?` | `string`[] | Deny wins over allow (pre-prefix names). | `packages/core/dist/index.d.ts` |
| <a id="property-prefix"></a> `prefix?` | `string` | Namespaces imported names as `${prefix}_${name}`. | `packages/core/dist/index.d.ts` |
| <a id="property-risk"></a> `risk?` | `Record`\&lt;`string`, [`ToolRisk`](/api/@rulvar/rulvar/type-aliases/ToolRisk.md)\&gt; | Host-supplied risk labels for imported tools. | `packages/core/dist/index.d.ts` |
| <a id="property-server"></a> `server?` | `unknown` | inprocess: in-memory server instance (anything with connect()). | `packages/core/dist/index.d.ts` |
| <a id="property-transport"></a> `transport` | `"inprocess"` \| `"stdio"` \| `"streamable-http"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-url"></a> `url?` | `string` | streamable-http: server endpoint. | `packages/core/dist/index.d.ts` |
