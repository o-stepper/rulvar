[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / McpConfig

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
| <a id="property-maxschemabytes"></a> `maxSchemaBytes?` | `number` | Per ADMITTED tool (allow/deny filter first): the UTF-8 byte length of the serialized inputSchema plus outputSchema when present (RV1515). An oversized tool refuses the resolution typed, naming the tool and its measured bytes; deny the tool or raise the cap. Positive integer; absent = unbounded. | [packages/core/src/tools/mcp.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L57) |
| <a id="property-maxtools"></a> `maxTools?` | `number` | Cap on WIRE tools accepted from the tools/list sweep (RV1515), checked after each page, PRE-filter: the sweep itself is the resource being bounded, so allow/deny cannot admit past it. A server that streams more refuses typed. Positive integer; absent = unbounded (today's behavior). | [packages/core/src/tools/mcp.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L49) |
| <a id="property-prefix"></a> `prefix?` | `string` | Namespaces imported names as `${prefix}_${name}`. | [packages/core/src/tools/mcp.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L37) |
| <a id="property-risk"></a> `risk?` | `Record`\&lt;`string`, [`ToolRisk`](/api/@rulvar/core/type-aliases/ToolRisk.md)\&gt; | Host-supplied risk labels for imported tools. | [packages/core/src/tools/mcp.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L41) |
| <a id="property-server"></a> `server?` | `unknown` | inprocess: in-memory server instance (anything with connect()). | [packages/core/src/tools/mcp.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L31) |
| <a id="property-timeouts"></a> `timeouts?` | \{ `callMs?`: `number`; `connectMs?`: `number`; `listMs?`: `number`; \} | Per-source latency bounds (RV1515). connectMs races the transport handshake (on expiry the client, and for stdio its child, is released and the refusal is typed). listMs and callMs ride the SDK request timeout per tools/list page and per tools/call; without them the SDK's own 60s default request timeout applies. A call timeout surfaces as the tool's error result, never past policy. Each a positive finite number of milliseconds. | [packages/core/src/tools/mcp.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L67) |
| `timeouts.callMs?` | `number` | - | [packages/core/src/tools/mcp.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L67) |
| `timeouts.connectMs?` | `number` | - | [packages/core/src/tools/mcp.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L67) |
| `timeouts.listMs?` | `number` | - | [packages/core/src/tools/mcp.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L67) |
| <a id="property-transport"></a> `transport` | `"inprocess"` \| `"stdio"` \| `"streamable-http"` | - | [packages/core/src/tools/mcp.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L24) |
| <a id="property-url"></a> `url?` | `string` | streamable-http: server endpoint. | [packages/core/src/tools/mcp.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/mcp.ts#L29) |
