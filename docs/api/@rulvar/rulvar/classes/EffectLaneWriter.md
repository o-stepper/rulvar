[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EffectLaneWriter

# Class: EffectLaneWriter

Defined in: `packages/core/dist/index.d.ts`

## Constructors

### Constructor

```ts
new EffectLaneWriter(options): EffectLaneWriter;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`EffectLaneWriterOptions`](/api/@rulvar/rulvar/interfaces/EffectLaneWriterOptions.md) |

#### Returns

`EffectLaneWriter`

## Methods

### appendDisposition()

```ts
appendDisposition(intentSeq, spec): Promise<EffectAppendResult>;
```

Defined in: `packages/core/dist/index.d.ts`

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

`Promise`\&lt;[`EffectAppendResult`](/api/@rulvar/rulvar/interfaces/EffectAppendResult.md)\&gt;

***

### appendIncident()

```ts
appendIncident(intentSeq, spec): Promise<EffectAppendResult>;
```

Defined in: `packages/core/dist/index.d.ts`

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

`Promise`\&lt;[`EffectAppendResult`](/api/@rulvar/rulvar/interfaces/EffectAppendResult.md)\&gt;

***

### appendOutcome()

```ts
appendOutcome(
   intentSeq, 
   attemptSeq, 
spec): Promise<EffectAppendResult>;
```

Defined in: `packages/core/dist/index.d.ts`

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

`Promise`\&lt;[`EffectAppendResult`](/api/@rulvar/rulvar/interfaces/EffectAppendResult.md)\&gt;

***

### appendProbe()

```ts
appendProbe(intentSeq, spec): Promise<EffectAppendResult>;
```

Defined in: `packages/core/dist/index.d.ts`

Journals one provider probe (the durable lookup budget row).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `intentSeq` | `number` |
| `spec` | \{ `acceptanceClosed?`: `boolean`; `found`: `boolean`; `opId?`: `string`; `probe`: `"lookup"` \| `"close-acceptance"`; \} |
| `spec.acceptanceClosed?` | `boolean` |
| `spec.found` | `boolean` |
| `spec.opId?` | `string` |
| `spec.probe` | `"lookup"` \| `"close-acceptance"` |

#### Returns

`Promise`\&lt;[`EffectAppendResult`](/api/@rulvar/rulvar/interfaces/EffectAppendResult.md)\&gt;

***

### appendReceipt()

```ts
appendReceipt(intentSeq, spec): Promise<EffectAppendResult>;
```

Defined in: `packages/core/dist/index.d.ts`

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

`Promise`\&lt;[`EffectAppendResult`](/api/@rulvar/rulvar/interfaces/EffectAppendResult.md)\&gt;

***

### appendReconciliationComplete()

```ts
appendReconciliationComplete(spec): Promise<EffectAppendResult>;
```

Defined in: `packages/core/dist/index.d.ts`

Releases a restoration epoch after its sweep (RFC 4.5, item 3).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | \{ `epochRef`: `number`; `opId`: `string`; `swept`: `number`; \} |
| `spec.epochRef` | `number` |
| `spec.opId` | `string` |
| `spec.swept` | `number` |

#### Returns

`Promise`\&lt;[`EffectAppendResult`](/api/@rulvar/rulvar/interfaces/EffectAppendResult.md)\&gt;

***

### appendStandaloneQuarantine()

```ts
appendStandaloneQuarantine(spec): Promise<EffectAppendResult>;
```

Defined in: `packages/core/dist/index.d.ts`

A durable standalone quarantine (the kill 25 sweep records).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | \{ `logicalKey`: `string`; `opId`: `string`; `reason`: `string`; \} |
| `spec.logicalKey` | `string` |
| `spec.opId` | `string` |
| `spec.reason` | `string` |

#### Returns

`Promise`\&lt;[`EffectAppendResult`](/api/@rulvar/rulvar/interfaces/EffectAppendResult.md)\&gt;

***

### appendStandaloneRefusal()

```ts
appendStandaloneRefusal(spec): Promise<EffectAppendResult>;
```

Defined in: `packages/core/dist/index.d.ts`

A durable standalone refusal for a logical key (no machine).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | \{ `logicalKey`: `string`; `opId`: `string`; `reason`: `string`; \} |
| `spec.logicalKey` | `string` |
| `spec.opId` | `string` |
| `spec.reason` | `string` |

#### Returns

`Promise`\&lt;[`EffectAppendResult`](/api/@rulvar/rulvar/interfaces/EffectAppendResult.md)\&gt;

***

### appendTerminal()

```ts
appendTerminal(intentSeq, spec): Promise<EffectAppendResult>;
```

Defined in: `packages/core/dist/index.d.ts`

Appends a terminal transition; the fold's legality rules decide.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `intentSeq` | `number` |
| `spec` | \{ `causalRef?`: `number`; `opId`: `string`; `reason?`: `string`; `terminal`: [`EffectTerminalState`](/api/@rulvar/rulvar/type-aliases/EffectTerminalState.md); \} |
| `spec.causalRef?` | `number` |
| `spec.opId` | `string` |
| `spec.reason?` | `string` |
| `spec.terminal` | [`EffectTerminalState`](/api/@rulvar/rulvar/type-aliases/EffectTerminalState.md) |

#### Returns

`Promise`\&lt;[`EffectAppendResult`](/api/@rulvar/rulvar/interfaces/EffectAppendResult.md)\&gt;

***

### close()

```ts
close(): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Returns

`Promise`\&lt;`void`\&gt;

***

### consumeApprovalAndRecordIntent()

```ts
consumeApprovalAndRecordIntent(spec): Promise<EffectConsumeResult>;
```

Defined in: `packages/core/dist/index.d.ts`

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
| `spec` | [`EffectIntentSpec`](/api/@rulvar/rulvar/interfaces/EffectIntentSpec.md) |

#### Returns

`Promise`\&lt;[`EffectConsumeResult`](/api/@rulvar/rulvar/interfaces/EffectConsumeResult.md)\&gt;

***

### ensureEpoch()

```ts
ensureEpoch(generation): Promise<EffectAppendResult>;
```

Defined in: `packages/core/dist/index.d.ts`

Appends the run incarnation's epoch fact (RFC section 4.5, item
2) when the latest epoch does not already record this generation
and the store's current restoration generation. Idempotent by its
derived operation id.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `generation` | `string` |

#### Returns

`Promise`\&lt;[`EffectAppendResult`](/api/@rulvar/rulvar/interfaces/EffectAppendResult.md)\&gt;

***

### entriesSnapshot()

```ts
entriesSnapshot(): Promise<readonly JournalEntry[]>;
```

Defined in: `packages/core/dist/index.d.ts`

The writer's current loaded entries (read-only snapshot).

#### Returns

`Promise`\&lt;readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;

***

### open()

```ts
open(): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

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

### refresh()

```ts
refresh(): Promise<EffectLaneFold>;
```

Defined in: `packages/core/dist/index.d.ts`

Reloads the journal and returns the fresh fold.

#### Returns

`Promise`\&lt;[`EffectLaneFold`](/api/@rulvar/rulvar/classes/EffectLaneFold.md)\&gt;

***

### view()

```ts
view(): EffectLaneFold;
```

Defined in: `packages/core/dist/index.d.ts`

The current fold over the writer's loaded view.

#### Returns

[`EffectLaneFold`](/api/@rulvar/rulvar/classes/EffectLaneFold.md)
