[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectLaneWriter

# Class: EffectLaneWriter

Defined in: [packages/core/src/effects/writer.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/writer.ts#L113)

## Constructors

### Constructor

```ts
new EffectLaneWriter(options): EffectLaneWriter;
```

Defined in: [packages/core/src/effects/writer.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/writer.ts#L125)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`EffectLaneWriterOptions`](/api/@rulvar/core/interfaces/EffectLaneWriterOptions.md) |

#### Returns

`EffectLaneWriter`

## Methods

### appendDisposition()

```ts
appendDisposition(intentSeq, spec): Promise<EffectAppendResult>;
```

Defined in: [packages/core/src/effects/writer.ts:639](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/writer.ts#L639)

Records a human disposition of a quarantine or an incident.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `intentSeq` | `number` |
| `spec` | \{ `causalRef?`: `number`; `disposition`: `string`; `opId`: `string`; `principal`: `string`; `reason`: `string`; \} |
| `spec.causalRef?` | `number` |
| `spec.disposition` | `string` |
| `spec.opId` | `string` |
| `spec.principal` | `string` |
| `spec.reason` | `string` |

#### Returns

`Promise`\&lt;[`EffectAppendResult`](/api/@rulvar/core/interfaces/EffectAppendResult.md)\&gt;

***

### appendIncident()

```ts
appendIncident(intentSeq, spec): Promise<EffectAppendResult>;
```

Defined in: [packages/core/src/effects/writer.ts:623](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/writer.ts#L623)

Records a linked incident on a machine.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `intentSeq` | `number` |
| `spec` | \{ `causalRef?`: `number`; `detail?`: `string`; `incident`: `string`; `opId`: `string`; \} |
| `spec.causalRef?` | `number` |
| `spec.detail?` | `string` |
| `spec.incident` | `string` |
| `spec.opId` | `string` |

#### Returns

`Promise`\&lt;[`EffectAppendResult`](/api/@rulvar/core/interfaces/EffectAppendResult.md)\&gt;

***

### appendOutcome()

```ts
appendOutcome(
   intentSeq, 
   attemptSeq, 
spec): Promise<EffectAppendResult>;
```

Defined in: [packages/core/src/effects/writer.ts:557](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/writer.ts#L557)

Classifies one open attempt's result.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `intentSeq` | `number` |
| `attemptSeq` | `number` |
| `spec` | \{ `detail?`: `string`; `opId`: `string`; `outcome`: `"accepted"` \| `"failed"` \| `"unknown"`; \} |
| `spec.detail?` | `string` |
| `spec.opId` | `string` |
| `spec.outcome` | `"accepted"` \| `"failed"` \| `"unknown"` |

#### Returns

`Promise`\&lt;[`EffectAppendResult`](/api/@rulvar/core/interfaces/EffectAppendResult.md)\&gt;

***

### appendReceipt()

```ts
appendReceipt(intentSeq, spec): Promise<EffectAppendResult>;
```

Defined in: [packages/core/src/effects/writer.ts:575](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/writer.ts#L575)

Records a receipt observation with the caller's verification verdict.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `intentSeq` | `number` |
| `spec` | \{ `amount?`: `number`; `currency?`: `string`; `detail?`: `string`; `documentHash?`: `string`; `opId`: `string`; `providerRef?`: `string`; `timestamp?`: `string`; `transferId?`: `string`; `verification`: `"verified"` \| `"unverified"`; \} |
| `spec.amount?` | `number` |
| `spec.currency?` | `string` |
| `spec.detail?` | `string` |
| `spec.documentHash?` | `string` |
| `spec.opId` | `string` |
| `spec.providerRef?` | `string` |
| `spec.timestamp?` | `string` |
| `spec.transferId?` | `string` |
| `spec.verification` | `"verified"` \| `"unverified"` |

#### Returns

`Promise`\&lt;[`EffectAppendResult`](/api/@rulvar/core/interfaces/EffectAppendResult.md)\&gt;

***

### appendTerminal()

```ts
appendTerminal(intentSeq, spec): Promise<EffectAppendResult>;
```

Defined in: [packages/core/src/effects/writer.ts:601](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/writer.ts#L601)

Appends a terminal transition; the fold's legality rules decide.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `intentSeq` | `number` |
| `spec` | \{ `causalRef?`: `number`; `opId`: `string`; `reason?`: `string`; `terminal`: [`EffectTerminalState`](/api/@rulvar/core/type-aliases/EffectTerminalState.md); \} |
| `spec.causalRef?` | `number` |
| `spec.opId` | `string` |
| `spec.reason?` | `string` |
| `spec.terminal` | [`EffectTerminalState`](/api/@rulvar/core/type-aliases/EffectTerminalState.md) |

#### Returns

`Promise`\&lt;[`EffectAppendResult`](/api/@rulvar/core/interfaces/EffectAppendResult.md)\&gt;

***

### close()

```ts
close(): Promise<void>;
```

Defined in: [packages/core/src/effects/writer.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/writer.ts#L160)

#### Returns

`Promise`\&lt;`void`\&gt;

***

### consumeApprovalAndRecordIntent()

```ts
consumeApprovalAndRecordIntent(spec): Promise<EffectConsumeResult>;
```

Defined in: [packages/core/src/effects/writer.ts:337](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/writer.ts#L337)

Consumes a standing approval and records the intent as ONE append
(RFC section 4.3). Intake refusals (an effect approval without a
deadline; a grant expiry the local clock has crossed, which the
writer first materializes as an appended `approval_expired`
decision, the deterministic truth) throw typed WITHOUT appending
an intent. A contention give-up appends a durable standalone
`refused` record, then throws.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`EffectIntentSpec`](/api/@rulvar/core/interfaces/EffectIntentSpec.md) |

#### Returns

`Promise`\&lt;[`EffectConsumeResult`](/api/@rulvar/core/interfaces/EffectConsumeResult.md)\&gt;

***

### ensureEpoch()

```ts
ensureEpoch(generation): Promise<EffectAppendResult>;
```

Defined in: [packages/core/src/effects/writer.ts:306](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/writer.ts#L306)

Appends the run incarnation's epoch fact (RFC section 4.5, item
2) when the latest epoch does not already record this generation
and the store's current restoration generation. Idempotent by its
derived operation id.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `generation` | `string` |

#### Returns

`Promise`\&lt;[`EffectAppendResult`](/api/@rulvar/core/interfaces/EffectAppendResult.md)\&gt;

***

### open()

```ts
open(): Promise<void>;
```

Defined in: [packages/core/src/effects/writer.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/writer.ts#L149)

#### Returns

`Promise`\&lt;`void`\&gt;

***

### openAttempt()

```ts
openAttempt(intentSeq, spec): Promise<
  | {
  cancelled: true;
  terminalSeq: number;
}
  | {
  attemptSeq: number;
  cancelled: false;
  replayed: boolean;
}>;
```

Defined in: [packages/core/src/effects/writer.ts:491](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/writer.ts#L491)

Opens one dispatch attempt (RFC section 3.1, item 3), with the
pre-attempt re-fold of section 4.3, item 5: a revocation or expiry
with ZERO attempts cancels cleanly (the writer appends
`cancelled-before-dispatch` and reports it); with an open history
it refuses typed, because recovery from that position is
reconcile-only on every capability row.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `intentSeq` | `number` |
| `spec` | \{ `idempotencyKey?`: `string`; `notAfter`: `string`; `opId`: `string`; `transport?`: `string`; \} |
| `spec.idempotencyKey?` | `string` |
| `spec.notAfter` | `string` |
| `spec.opId` | `string` |
| `spec.transport?` | `string` |

#### Returns

`Promise`\<
  \| \{
  `cancelled`: `true`;
  `terminalSeq`: `number`;
\}
  \| \{
  `attemptSeq`: `number`;
  `cancelled`: `false`;
  `replayed`: `boolean`;
\}\>

***

### view()

```ts
view(): EffectLaneFold;
```

Defined in: [packages/core/src/effects/writer.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/writer.ts#L171)

The current fold over the writer's loaded view.

#### Returns

[`EffectLaneFold`](/api/@rulvar/core/classes/EffectLaneFold.md)
