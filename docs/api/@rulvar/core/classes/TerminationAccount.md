[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TerminationAccount

# Class: TerminationAccount

Defined in: [packages/core/src/journal/termination.ts:259](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L259)

The single per-run TerminationAccount: debit ONLY. No
credit operation exists by construction; reclaim never replenishes
anything (DEF-5 interaction). Live: the engine debits the
in-memory account, writes the carrying entry with the balance-after,
then applies effects. Resume state is rebuilt by TerminationFold from
the journal, never from live config.

## Constructors

### Constructor

```ts
new TerminationAccount(options): TerminationAccount;
```

Defined in: [packages/core/src/journal/termination.ts:266](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L266)

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
| <a id="property-limits"></a> `limits` | `readonly` | [`TerminationLimits`](/api/@rulvar/core/interfaces/TerminationLimits.md) | [packages/core/src/journal/termination.ts:260](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L260) |

## Accessors

### revisionUnitsRemaining

#### Get Signature

```ts
get revisionUnitsRemaining(): number;
```

Defined in: [packages/core/src/journal/termination.ts:322](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L322)

##### Returns

`number`

***

### spawnUnitsExhausted

#### Get Signature

```ts
get spawnUnitsExhausted(): boolean;
```

Defined in: [packages/core/src/journal/termination.ts:318](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L318)

True when a spawn-unit debit would underflow (pre-reserve check).

##### Returns

`boolean`

## Methods

### bindDeniedWriter()

```ts
bindDeniedWriter(writer): void;
```

Defined in: [packages/core/src/journal/termination.ts:280](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L280)

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

Defined in: [packages/core/src/journal/termination.ts:425](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L425)

The unified debit surface: attempts the named resource and, on
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

Defined in: [packages/core/src/journal/termination.ts:384](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L384)

The escalation debit: minus one escalationUnit of
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

Defined in: [packages/core/src/journal/termination.ts:369](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L369)

The plan_revise debit: minus one
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

Defined in: [packages/core/src/journal/termination.ts:400](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L400)

The ladder-raise debit: minus one rung of the
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

Defined in: [packages/core/src/journal/termination.ts:334](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L334)

The spawn-admission debit: minus one spawnUnit for
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

Defined in: [packages/core/src/journal/termination.ts:304](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L304)

Phi = V + C * S + sum over live lineages (E + R).

#### Returns

`number`

***

### restoreCounters()

```ts
restoreCounters(state): void;
```

Defined in: [packages/core/src/journal/termination.ts:490](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L490)

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

Defined in: [packages/core/src/journal/termination.ts:478](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L478)

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

Defined in: [packages/core/src/journal/termination.ts:313](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L313)

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

Defined in: [packages/core/src/journal/termination.ts:287](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L287)

#### Returns

[`TerminationAccountSnapshot`](/api/@rulvar/core/interfaces/TerminationAccountSnapshot.md)
