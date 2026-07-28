[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / ToolEffectRecord

# Interface: ToolEffectRecord

Defined in: [packages/executor/src/spi.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L74)

One dispatch's side-effect facts, for the ledger.

## Extends

- [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md)

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-argshash"></a> `argsHash` | `string` | sha256 of the canonical arguments: correlates without storing them. | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md).[`argsHash`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md#property-argshash) | [packages/executor/src/spi.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L66) |
| <a id="property-durationms"></a> `durationMs` | `number` | - | - | [packages/executor/src/spi.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L75) |
| <a id="property-executor"></a> `executor` | [`IsolatedExecutorTag`](/api/@rulvar/rulvar/type-aliases/IsolatedExecutorTag.md) | - | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md).[`executor`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md#property-executor) | [packages/executor/src/spi.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L67) |
| <a id="property-exitcode"></a> `exitCode` | `number` \| `null` | Child exit code, or null when terminated by a signal. | - | [packages/executor/src/spi.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L78) |
| <a id="property-idempotencykey"></a> `idempotencyKey` | `string` | The stable per-call idempotency key (createEngine derives it). | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md).[`idempotencyKey`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md#property-idempotencykey) | [packages/executor/src/spi.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L61) |
| <a id="property-outcome"></a> `outcome` | `"timeout"` \| `"error"` \| `"ok"` | - | - | [packages/executor/src/spi.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L76) |
| <a id="property-runid"></a> `runId` | `string` | - | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md).[`runId`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md#property-runid) | [packages/executor/src/spi.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L62) |
| <a id="property-signal"></a> `signal` | `string` \| `null` | The terminating signal, when any. | - | [packages/executor/src/spi.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L80) |
| <a id="property-spanid"></a> `spanId` | `string` | - | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md).[`spanId`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md#property-spanid) | [packages/executor/src/spi.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L63) |
| <a id="property-startedat"></a> `startedAt` | `number` | - | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md).[`startedAt`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md#property-startedat) | [packages/executor/src/spi.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L70) |
| <a id="property-tool"></a> `tool` | `string` | - | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md).[`tool`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md#property-tool) | [packages/executor/src/spi.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L64) |
| <a id="property-workdir"></a> `workdir` | `string` | The ephemeral working directory the dispatch runs in. | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md).[`workdir`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md#property-workdir) | [packages/executor/src/spi.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L69) |
