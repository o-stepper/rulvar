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
| <a id="property-maxschemabytes"></a> `maxSchemaBytes?` | `number` | Per ADMITTED tool (allow/deny filter first): the UTF-8 byte length of the serialized inputSchema plus outputSchema when present (RV1515). An oversized tool refuses the resolution typed, naming the tool and its measured bytes; deny the tool or raise the cap. Positive integer; absent = unbounded. | `packages/core/dist/index.d.ts` |
| <a id="property-maxtools"></a> `maxTools?` | `number` | Cap on WIRE tools accepted from the tools/list sweep (RV1515), checked after each page, PRE-filter: the sweep itself is the resource being bounded, so allow/deny cannot admit past it. A server that streams more refuses typed. Positive integer; absent = unbounded (today's behavior). | `packages/core/dist/index.d.ts` |
| <a id="property-prefix"></a> `prefix?` | `string` | Namespaces imported names as `${prefix}_${name}`. | `packages/core/dist/index.d.ts` |
| <a id="property-risk"></a> `risk?` | `Record`\&lt;`string`, [`ToolRisk`](/api/@rulvar/rulvar/type-aliases/ToolRisk.md)\&gt; | Host-supplied risk labels for imported tools. | `packages/core/dist/index.d.ts` |
| <a id="property-server"></a> `server?` | `unknown` | inprocess: in-memory server instance (anything with connect()). | `packages/core/dist/index.d.ts` |
| <a id="property-timeouts"></a> `timeouts?` | \{ `callMs?`: `number`; `connectMs?`: `number`; `listMs?`: `number`; \} | Per-source latency bounds (RV1515). connectMs races the transport handshake (on expiry the client, and for stdio its child, is released and the refusal is typed). listMs and callMs ride the SDK request timeout per tools/list page and per tools/call; without them the SDK's own 60s default request timeout applies. A call timeout surfaces as the tool's error result, never past policy. Each a positive finite number of milliseconds. | `packages/core/dist/index.d.ts` |
| `timeouts.callMs?` | `number` | - | `packages/core/dist/index.d.ts` |
| `timeouts.connectMs?` | `number` | - | `packages/core/dist/index.d.ts` |
| `timeouts.listMs?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-transport"></a> `transport` | `"inprocess"` \| `"stdio"` \| `"streamable-http"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-url"></a> `url?` | `string` | streamable-http: server endpoint. | `packages/core/dist/index.d.ts` |
