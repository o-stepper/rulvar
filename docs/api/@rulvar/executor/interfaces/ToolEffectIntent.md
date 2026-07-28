[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/executor](/api/@rulvar/executor/index.md) / ToolEffectIntent

# Interface: ToolEffectIntent

Defined in: [packages/executor/src/spi.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L59)

The pre-dispatch half of a two-phase ledger entry (RV404): everything
the executor knows BEFORE the external effect is dispatched, which is
exactly the set a host needs to reconcile an orphaned effect with the
effect's provider (look the idempotency key up, correlate by tool and
argsHash). `startedAt` is the attempt join key: the outcome record of
the same attempt carries the identical value.

## Extended by

- [`ToolEffectRecord`](/api/@rulvar/executor/interfaces/ToolEffectRecord.md)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-argshash"></a> `argsHash` | `string` | sha256 of the canonical arguments: correlates without storing them. | [packages/executor/src/spi.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L66) |
| <a id="property-executor"></a> `executor` | [`IsolatedExecutorTag`](/api/@rulvar/rulvar/type-aliases/IsolatedExecutorTag.md) | - | [packages/executor/src/spi.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L67) |
| <a id="property-idempotencykey"></a> `idempotencyKey` | `string` | The stable per-call idempotency key (createEngine derives it). | [packages/executor/src/spi.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L61) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/executor/src/spi.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L62) |
| <a id="property-spanid"></a> `spanId` | `string` | - | [packages/executor/src/spi.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L63) |
| <a id="property-startedat"></a> `startedAt` | `number` | - | [packages/executor/src/spi.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L70) |
| <a id="property-tool"></a> `tool` | `string` | - | [packages/executor/src/spi.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L64) |
| <a id="property-workdir"></a> `workdir` | `string` | The ephemeral working directory the dispatch runs in. | [packages/executor/src/spi.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/executor/src/spi.ts#L69) |
