[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DeterminismConfig

# Interface: DeterminismConfig

Defined in: [packages/core/src/runner/determinism.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/determinism.ts#L45)

Host configuration for the guard (CreateEngineOptions.determinism).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-allowlist"></a> `allowlist?` | readonly (`string` \| `RegExp`)[] | Caller frames matching any pattern are exempt by explicit host decision: classified 'allowlisted' in the emitted event, never a process warning, never a rejection. A string matches as a substring of the frame; a RegExp matches by test. Patterns match the RAW frame, before any redaction. Installed dependencies (node_modules) and Node runtime frames (`node:` specifiers) are exempt WITHOUT configuration and emit nothing at all. | [packages/core/src/runner/determinism.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/determinism.ts#L56) |
| <a id="property-mode"></a> `mode?` | [`DeterminismMode`](/api/@rulvar/core/type-aliases/DeterminismMode.md) | - | [packages/core/src/runner/determinism.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/determinism.ts#L46) |
| <a id="property-redact"></a> `redact?` | (`frame`) => `string` | Redaction hook for public telemetry: applied to the frame and the parsed file path before they leave in events, process warnings, and DeterminismError data, so absolute host paths need not reach an OTel backend. Default: identity. | [packages/core/src/runner/determinism.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runner/determinism.ts#L63) |
