[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / ToolEffectRecord

# Interface: ToolEffectRecord

Defined in: [packages/executor/src/spi.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L96)

One dispatch's side-effect facts, for the ledger.

## Extends

- [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md)

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-argshash"></a> `argsHash` | `string` | sha256 of the canonical arguments: correlates without storing them. | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md).[`argsHash`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md#property-argshash) | [packages/executor/src/spi.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L69) |
| <a id="property-attemptid"></a> `attemptId?` | `string` | Unique id of this dispatch ATTEMPT (RV501): the reference executors mint one before the intent row is written and copy it verbatim onto the same attempt's outcome row, so the two phases pair exactly. Optional because rows written before v1.96.0 (and third-party ledgers) may omit it; [loadEffectLedger](/api/@rulvar/executor/functions/loadEffectLedger.md) then falls back to the legacy (idempotencyKey, startedAt) join. | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md).[`attemptId`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md#property-attemptid) | [packages/executor/src/spi.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L92) |
| <a id="property-cwd"></a> `cwd?` | `string` | The acquired worktree the tool ran in (RV4914), present exactly when the request carried one: the child's working directory under the subprocess executor, the host directory bind mounted at `workMount` under the container executor. Absent otherwise, so rows written without one keep their historical shape. | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md).[`cwd`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md#property-cwd) | [packages/executor/src/spi.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L80) |
| <a id="property-durationms"></a> `durationMs` | `number` | - | - | [packages/executor/src/spi.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L97) |
| <a id="property-executor"></a> `executor` | [`IsolatedExecutorTag`](/api/@rulvar/rulvar/type-aliases/IsolatedExecutorTag.md) | - | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md).[`executor`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md#property-executor) | [packages/executor/src/spi.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L70) |
| <a id="property-exitcode"></a> `exitCode` | `number` \| `null` | Child exit code, or null when terminated by a signal. | - | [packages/executor/src/spi.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L100) |
| <a id="property-idempotencykey"></a> `idempotencyKey` | `string` | The stable per-call idempotency key (createEngine derives it). | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md).[`idempotencyKey`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md#property-idempotencykey) | [packages/executor/src/spi.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L64) |
| <a id="property-outcome"></a> `outcome` | `"timeout"` \| `"error"` \| `"ok"` | - | - | [packages/executor/src/spi.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L98) |
| <a id="property-runid"></a> `runId` | `string` | - | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md).[`runId`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md#property-runid) | [packages/executor/src/spi.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L65) |
| <a id="property-signal"></a> `signal` | `string` \| `null` | The terminating signal, when any. | - | [packages/executor/src/spi.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L102) |
| <a id="property-spanid"></a> `spanId` | `string` | - | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md).[`spanId`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md#property-spanid) | [packages/executor/src/spi.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L66) |
| <a id="property-startedat"></a> `startedAt` | `number` | - | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md).[`startedAt`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md#property-startedat) | [packages/executor/src/spi.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L83) |
| <a id="property-tool"></a> `tool` | `string` | - | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md).[`tool`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md#property-tool) | [packages/executor/src/spi.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L67) |
| <a id="property-workdir"></a> `workdir` | `string` | The ephemeral working directory the dispatch runs in. | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md).[`workdir`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md#property-workdir) | [packages/executor/src/spi.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L72) |
| <a id="property-workmount"></a> `workMount?` | `string` | Under the container executor with a `cwd`: the container path it is mounted at (RV4914). | [`ToolEffectIntent`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md).[`workMount`](/api/@rulvar/executor/interfaces/ToolEffectIntent.md#property-workmount) | [packages/executor/src/spi.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L82) |
