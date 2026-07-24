[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / ChildResult

# Interface: ChildResult

Defined in: [packages/executor/src/child.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/child.ts#L38)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `number` \| `null` | Process exit code; null when the child was terminated by a signal. | [packages/executor/src/child.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/child.ts#L42) |
| <a id="property-reason"></a> `reason?` | [`ChildStopReason`](/api/@rulvar/executor/type-aliases/ChildStopReason.md) | - | [packages/executor/src/child.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/child.ts#L47) |
| <a id="property-signal"></a> `signal` | `Signals` \| `null` | The terminating signal, when any. | [packages/executor/src/child.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/child.ts#L44) |
| <a id="property-stderr"></a> `stderr` | `string` | - | [packages/executor/src/child.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/child.ts#L40) |
| <a id="property-stdout"></a> `stdout` | `string` | - | [packages/executor/src/child.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/child.ts#L39) |
| <a id="property-stopped"></a> `stopped` | `boolean` | True when the runner (not the child) ended it, with the reason why. | [packages/executor/src/child.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/child.ts#L46) |
