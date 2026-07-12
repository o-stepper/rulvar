[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TerminationAccount

# Class: TerminationAccount

Defined in: [packages/core/src/journal/termination.ts:254](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L254)

The single per-run TerminationAccount (docs/07, 11.5): debit ONLY. No
credit operation exists by construction; reclaim never replenishes
anything (DEF-5 interaction, docs/07 7.3). Live: the engine debits the
in-memory account, writes the carrying entry with the balance-after,
then applies effects. Resume state is rebuilt by TerminationFold from
the journal, never from live config.

## Constructors

### Constructor

```ts
new TerminationAccount(options): TerminationAccount;
```

Defined in: [packages/core/src/journal/termination.ts:261](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L261)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `deniedWriter?`: [`TerminationDeniedWriter`](/api/@rulvar/core/type-aliases/TerminationDeniedWriter.md); `limits`: [`TerminationLimits`](/api/@rulvar/core/interfaces/TerminationLimits.md); \} |
| `options.deniedWriter?` | [`TerminationDeniedWriter`](/api/@rulvar/core/type-aliases/TerminationDeniedWriter.md) |
| `options.limits` | [`TerminationLimits`](/api/@rulvar/core/interfaces/TerminationLimits.md) |

#### Returns

`TerminationAccount`

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-limits"></a> `limits` | `readonly` | [`TerminationLimits`](/api/@rulvar/core/interfaces/TerminationLimits.md) | [packages/core/src/journal/termination.ts:255](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L255) |

## Accessors

### revisionUnitsRemaining

#### Get Signature

```ts
get revisionUnitsRemaining(): number;
```

Defined in: [packages/core/src/journal/termination.ts:317](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L317)

##### Returns

`number`

***

### spawnUnitsExhausted

#### Get Signature

```ts
get spawnUnitsExhausted(): boolean;
```

Defined in: [packages/core/src/journal/termination.ts:313](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L313)

True when a spawn-unit debit would underflow (pre-reserve check).

##### Returns

`boolean`

## Methods

### bindDeniedWriter()

```ts
bindDeniedWriter(writer): void;
```

Defined in: [packages/core/src/journal/termination.ts:275](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L275)

Binds the denied-entry appender onto an account rebuilt by the fold
(resume path): the fold is pure and cannot own I/O. Never rebinds an
existing writer.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `writer` | [`TerminationDeniedWriter`](/api/@rulvar/core/type-aliases/TerminationDeniedWriter.md) |

#### Returns

`void`

***

### debit()

```ts
debit(
   resource, 
   lineage?, 
context?): Promise<DebitResult>;
```

Defined in: [packages/core/src/journal/termination.ts:420](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L420)

The docs/07 11.5 debit surface: attempts the named resource and, on
underflow, writes `termination.denied` strictly BEFORE resolving with
the typed failure (the caller surfaces the error only after this
settles). Requires a deniedWriter; pure-fold contexts use the
synchronous per-resource methods instead.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `resource` | `"revisionUnits"` \| `"spawnUnits"` \| `"escalationUnits"` \| `"rungs"` |
| `lineage?` | `string` |
| `context?` | \{ `reasonCode?`: `string`; `requestedByRef?`: `number`; \} |
| `context.reasonCode?` | `string` |
| `context.requestedByRef?` | `number` |

#### Returns

`Promise`\&lt;[`DebitResult`](/api/@rulvar/core/type-aliases/DebitResult.md)\&gt;

***

### debitEscalation()

```ts
debitEscalation(logicalTaskId): 
  | {
  escalationUnitsAfter: number;
  ok: true;
}
  | {
  ok: false;
  resource: "escalationUnits";
};
```

Defined in: [packages/core/src/journal/termination.ts:379](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L379)

The escalation debit (docs/07, 11.3d): minus one escalationUnit of
the affected lineage, including EACH lineage of a class-level
decision and timeout defaultDecisions. Conditioned on the
countsAgainstLimit flag embedded in the decision entry by the caller.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `logicalTaskId` | `string` |

#### Returns

  \| \{
  `escalationUnitsAfter`: `number`;
  `ok`: `true`;
\}
  \| \{
  `ok`: `false`;
  `resource`: `"escalationUnits"`;
\}

***

### debitRevision()

```ts
debitRevision(): 
  | {
  ok: true;
  revisionUnitsAfter: number;
}
  | {
  ok: false;
  resource: "revisionUnits";
};
```

Defined in: [packages/core/src/journal/termination.ts:364](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L364)

The plan_revise debit (docs/07, 11.3a and 11.7): minus one
revisionUnit on EVERY journaled plan.revision, regardless of the op
count, guard verdicts, or the auto-rebase outcome; conflict spam is
never a free retry.

#### Returns

  \| \{
  `ok`: `true`;
  `revisionUnitsAfter`: `number`;
\}
  \| \{
  `ok`: `false`;
  `resource`: `"revisionUnits"`;
\}

***

### debitRung()

```ts
debitRung(logicalTaskId): 
  | {
  ok: true;
  rungIndexAfter: number;
  rungsRemainingAfter: number;
}
  | {
  ok: false;
  resource: "rungs";
};
```

Defined in: [packages/core/src/journal/termination.ts:395](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L395)

The ladder-raise debit (docs/07, 11.3c): minus one rung of the
lineage; rungIndex is strictly monotone, there are no demotions and
no runtime startTier promotion in v1.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `logicalTaskId` | `string` |

#### Returns

  \| \{
  `ok`: `true`;
  `rungIndexAfter`: `number`;
  `rungsRemainingAfter`: `number`;
\}
  \| \{
  `ok`: `false`;
  `resource`: `"rungs"`;
\}

***

### debitSpawn()

```ts
debitSpawn(lineage?): 
  | {
  ok: true;
  spawnUnitsAfter: number;
}
  | {
  ok: false;
  resource: "spawnUnits";
};
```

Defined in: [packages/core/src/journal/termination.ts:329](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L329)

The spawn-admission debit (docs/07, 11.3b): minus one spawnUnit for
an admitted spawn of ANY origin; a NEW lineage receives E0 escalation
units and (K_l - 1) rung transitions in the same atomic step, so the
lemma's per-spawn decrease is C - (E0 + K_l - 1) = kMax - K_l + 1,
at least 1. Synchronous: the caller embeds spawnUnitsAfter in the
decision entry it appends next.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `lineage?` | \{ `isNew`: `boolean`; `ladderLength?`: `number`; `logicalTaskId`: `string`; \} |
| `lineage.isNew?` | `boolean` |
| `lineage.ladderLength?` | `number` |
| `lineage.logicalTaskId?` | `string` |

#### Returns

  \| \{
  `ok`: `true`;
  `spawnUnitsAfter`: `number`;
\}
  \| \{
  `ok`: `false`;
  `resource`: `"spawnUnits"`;
\}

***

### phi()

```ts
phi(): number;
```

Defined in: [packages/core/src/journal/termination.ts:299](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L299)

Phi = V + C * S + sum over live lineages (E + R) (docs/07, 11.4).

#### Returns

`number`

***

### restoreCounters()

```ts
restoreCounters(state): void;
```

Defined in: [packages/core/src/journal/termination.ts:485](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L485)

Fold use only: restores the run counters from journaled balances.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `state` | \{ `revisionUnitsRemaining?`: `number`; `spawnUnitsRemaining?`: `number`; \} |
| `state.revisionUnitsRemaining?` | `number` |
| `state.spawnUnitsRemaining?` | `number` |

#### Returns

`void`

***

### restoreLineage()

```ts
restoreLineage(logicalTaskId, state): void;
```

Defined in: [packages/core/src/journal/termination.ts:473](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L473)

Restores one lineage's counters from journaled balances (fold use
only): never a credit path, the fold consumes recorded balances.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `logicalTaskId` | `string` |
| `state` | [`LineageCounters`](/api/@rulvar/core/interfaces/LineageCounters.md) & \{ `rungIndex?`: `number`; \} |

#### Returns

`void`

***

### rungIndexOf()

```ts
rungIndexOf(logicalTaskId): number;
```

Defined in: [packages/core/src/journal/termination.ts:308](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L308)

The current rung index of a lineage (0 before any raise).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `logicalTaskId` | `string` |

#### Returns

`number`

***

### snapshot()

```ts
snapshot(): TerminationAccountSnapshot;
```

Defined in: [packages/core/src/journal/termination.ts:282](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L282)

#### Returns

[`TerminationAccountSnapshot`](/api/@rulvar/core/interfaces/TerminationAccountSnapshot.md)
