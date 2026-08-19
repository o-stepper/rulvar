[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / McpSourceRegulatedPosture

# Interface: McpSourceRegulatedPosture

Defined in: [packages/core/src/l0/spi/regulated-posture.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L27)

The posture an mcp() tool source chose at construction (RV1516/RV1808).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-bounds"></a> `bounds` | \{ `declared`: `boolean`; `discoveryMs?`: `number`; `maxPages?`: `number`; `maxSchemaBytes?`: `number`; `maxTools?`: `number`; \} | The discovery bounds (RV1808); `declared` is the all-four predicate `requireBounds` enforces (maxTools, maxPages, maxSchemaBytes, timeouts.discoveryMs), and the declared values ride beside it so the profile hash moves when a bound moves. | [packages/core/src/l0/spi/regulated-posture.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L41) |
| `bounds.declared` | `boolean` | - | [packages/core/src/l0/spi/regulated-posture.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L42) |
| `bounds.discoveryMs?` | `number` | - | [packages/core/src/l0/spi/regulated-posture.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L46) |
| `bounds.maxPages?` | `number` | - | [packages/core/src/l0/spi/regulated-posture.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L44) |
| `bounds.maxSchemaBytes?` | `number` | - | [packages/core/src/l0/spi/regulated-posture.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L45) |
| `bounds.maxTools?` | `number` | - | [packages/core/src/l0/spi/regulated-posture.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L43) |
| <a id="property-drift"></a> `drift` | `"rekey"` \| `"refuse"` | What a listChanged notification means for this source (RV1516). | [packages/core/src/l0/spi/regulated-posture.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L34) |
| <a id="property-kind"></a> `kind` | `"mcp-source"` | - | [packages/core/src/l0/spi/regulated-posture.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L30) |
| <a id="property-name"></a> `name` | `string` | The source id (`mcp:stdio:<command>`, `mcp:http:<url>`, `mcp:inprocess`). | [packages/core/src/l0/spi/regulated-posture.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L32) |
| <a id="property-regulatedposture"></a> `regulatedPosture` | `1` | Descriptor shape version; bumps when the meaning changes. | [packages/core/src/l0/spi/regulated-posture.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/regulated-posture.ts#L29) |
