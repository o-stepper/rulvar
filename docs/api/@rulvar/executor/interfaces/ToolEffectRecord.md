[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / ToolEffectRecord

# Interface: ToolEffectRecord

Defined in: [packages/executor/src/spi.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L46)

One dispatch's side-effect facts, for the ledger.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-argshash"></a> `argsHash` | `string` | sha256 of the canonical arguments: correlates without storing them. | [packages/executor/src/spi.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L53) |
| <a id="property-durationms"></a> `durationMs` | `number` | - | [packages/executor/src/spi.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L58) |
| <a id="property-executor"></a> `executor` | [`IsolatedExecutorTag`](/api/@rulvar/rulvar/type-aliases/IsolatedExecutorTag.md) | - | [packages/executor/src/spi.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L54) |
| <a id="property-exitcode"></a> `exitCode` | `number` \| `null` | Child exit code, or null when terminated by a signal. | [packages/executor/src/spi.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L61) |
| <a id="property-idempotencykey"></a> `idempotencyKey` | `string` | The stable per-call idempotency key (createEngine derives it). | [packages/executor/src/spi.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L48) |
| <a id="property-outcome"></a> `outcome` | `"timeout"` \| `"error"` \| `"ok"` | - | [packages/executor/src/spi.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L59) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/executor/src/spi.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L49) |
| <a id="property-signal"></a> `signal` | `string` \| `null` | The terminating signal, when any. | [packages/executor/src/spi.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L63) |
| <a id="property-spanid"></a> `spanId` | `string` | - | [packages/executor/src/spi.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L50) |
| <a id="property-startedat"></a> `startedAt` | `number` | - | [packages/executor/src/spi.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L57) |
| <a id="property-tool"></a> `tool` | `string` | - | [packages/executor/src/spi.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L51) |
| <a id="property-workdir"></a> `workdir` | `string` | The ephemeral working directory the dispatch ran in. | [packages/executor/src/spi.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L56) |
