[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / ChildSpec

# Interface: ChildSpec

Defined in: [packages/executor/src/child.ts:13](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/child.ts#L13)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-args"></a> `args` | readonly `string`[] | - | [packages/executor/src/child.ts:15](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/child.ts#L15) |
| <a id="property-command"></a> `command` | `string` | - | [packages/executor/src/child.ts:14](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/child.ts#L14) |
| <a id="property-cwd"></a> `cwd` | `string` | - | [packages/executor/src/child.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/child.ts#L23) |
| <a id="property-env"></a> `env` | `Record`\&lt;`string`, `string`\&gt; | The child's COMPLETE environment. It replaces the host environment rather than extending it: whatever is not listed here is absent from the child, which is how host credentials in process.env are kept out of the tool. | [packages/executor/src/child.ts:22](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/child.ts#L22) |
| <a id="property-killgracems"></a> `killGraceMs` | `number` | Grace between SIGTERM and the SIGKILL that follows if it ignores it. | [packages/executor/src/child.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/child.ts#L29) |
| <a id="property-maxoutputbytes"></a> `maxOutputBytes` | `number` | Captured stdout/stderr are each bounded to this many bytes. | [packages/executor/src/child.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/child.ts#L31) |
| <a id="property-signal"></a> `signal?` | `AbortSignal` | Cancels the child immediately when it fires (run abort, budget, limits). | [packages/executor/src/child.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/child.ts#L33) |
| <a id="property-stdindata"></a> `stdinData` | `string` | Written to the child's stdin, which is then closed. | [packages/executor/src/child.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/child.ts#L25) |
| <a id="property-timeoutms"></a> `timeoutMs` | `number` | Hard wall-clock ceiling; on expiry the child is SIGTERM'd then SIGKILL'd. | [packages/executor/src/child.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/child.ts#L27) |
