[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / ConformanceExecutorConfig

# Interface: ConformanceExecutorConfig

Defined in: [packages/executor/src/conformance.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L33)

The executor options the shared contract exercises.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-allowenv"></a> `allowEnv?` | `string`[] | [packages/executor/src/conformance.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L36) |
| <a id="property-args"></a> `args` | `string`[] | [packages/executor/src/conformance.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L35) |
| <a id="property-command"></a> `command` | `string` | [packages/executor/src/conformance.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L34) |
| <a id="property-credentials"></a> `credentials?` | (`request`) => `Record`\&lt;`string`, `string`\&gt; | [packages/executor/src/conformance.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L37) |
| <a id="property-ledger"></a> `ledger?` | [`ToolEffectLedger`](/api/@rulvar/executor/interfaces/ToolEffectLedger.md) | [packages/executor/src/conformance.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L40) |
| <a id="property-maxoutputbytes"></a> `maxOutputBytes?` | `number` | [packages/executor/src/conformance.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L39) |
| <a id="property-timeoutms"></a> `timeoutMs?` | `number` | [packages/executor/src/conformance.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/conformance.ts#L38) |
