[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ToolsetAttestation

# Interface: ToolsetAttestation

Defined in: `packages/core/dist/index.d.ts`

A recorded toolset pin (RV1514): the aggregate toolsetHash a spawn
must resolve to, plus optional per-tool contract hashes that turn a
mismatch refusal into a named diff (changed / missing / unexpected).
Record one with [attestToolset](/api/@rulvar/rulvar/functions/attestToolset.md); declare it as
`AgentProfile.toolsetAttestation`. Provider-side drift of an imported
tool's description or schema re-keys new spawns silently by design;
an attested profile turns exactly that drift into a typed refusal at
spawn time, before any provider call.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-hash"></a> `hash` | `string` | The expected aggregate toolsetHash (64 lowercase hex chars). | `packages/core/dist/index.d.ts` |
| <a id="property-tools"></a> `tools?` | `Record`\&lt;`string`, `string`\&gt; | Per-tool contract hashes by tool name; enables the named diff. | `packages/core/dist/index.d.ts` |
