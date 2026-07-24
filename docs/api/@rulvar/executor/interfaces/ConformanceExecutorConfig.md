[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / ConformanceExecutorConfig

# Interface: ConformanceExecutorConfig

Defined in: [packages/executor/src/conformance.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L28)

The executor options the shared contract exercises.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-allowenv"></a> `allowEnv?` | `string`[] | [packages/executor/src/conformance.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L31) |
| <a id="property-args"></a> `args` | `string`[] | [packages/executor/src/conformance.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L30) |
| <a id="property-command"></a> `command` | `string` | [packages/executor/src/conformance.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L29) |
| <a id="property-credentials"></a> `credentials?` | (`request`) => `Record`\&lt;`string`, `string`\&gt; | [packages/executor/src/conformance.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L32) |
| <a id="property-ledger"></a> `ledger?` | [`ToolEffectLedger`](/api/@rulvar/executor/interfaces/ToolEffectLedger.md) & \{ `entries`: readonly [`ToolEffectRecord`](/api/@rulvar/executor/interfaces/ToolEffectRecord.md)[]; \} | [packages/executor/src/conformance.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L35) |
| <a id="property-maxoutputbytes"></a> `maxOutputBytes?` | `number` | [packages/executor/src/conformance.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L34) |
| <a id="property-timeoutms"></a> `timeoutMs?` | `number` | [packages/executor/src/conformance.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L33) |
