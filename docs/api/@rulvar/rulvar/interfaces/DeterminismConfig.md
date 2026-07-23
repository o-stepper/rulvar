[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / DeterminismConfig

# Interface: DeterminismConfig

Defined in: `packages/core/dist/index.d.ts`

Host configuration for the guard (CreateEngineOptions.determinism).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-allowlist"></a> `allowlist?` | readonly (`string` \| `RegExp`)[] | Caller frames matching any pattern are exempt by explicit host decision: classified 'allowlisted' in the emitted event, never a process warning, never a rejection. A string matches as a substring of the frame; a RegExp matches by test. Patterns match the RAW frame, before any redaction. Installed dependencies (node_modules) and Node runtime frames (`node:` specifiers) are exempt WITHOUT configuration and emit nothing at all. | `packages/core/dist/index.d.ts` |
| <a id="property-mode"></a> `mode?` | [`DeterminismMode`](/api/@rulvar/rulvar/type-aliases/DeterminismMode.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-redact"></a> `redact?` | (`frame`) => `string` | Redaction hook for public telemetry: applied to the frame and the parsed file path before they leave in events, process warnings, and DeterminismError data, so absolute host paths need not reach an OTel backend. Default: identity. | `packages/core/dist/index.d.ts` |
