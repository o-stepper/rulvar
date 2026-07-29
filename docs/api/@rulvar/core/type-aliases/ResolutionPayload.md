[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResolutionPayload

# Type Alias: ResolutionPayload

```ts
type ResolutionPayload = {
  by: ResolutionBy;
  countsAgainstLimit?: boolean;
  decisionRef?: number;
  logicalTaskId?: string;
  target: number;
  value: Json;
};
```

Defined in: [packages/core/src/l0/entries.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L61)

Payload of resolution ref-entries (DEF-4).

## Properties

### by

```ts
by: ResolutionBy;
```

Defined in: [packages/core/src/l0/entries.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L64)

***

### countsAgainstLimit?

```ts
optional countsAgainstLimit?: boolean;
```

Defined in: [packages/core/src/l0/entries.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L72)

Only on escalation resolutions (DEF-3, M7).

***

### decisionRef?

```ts
optional decisionRef?: number;
```

Defined in: [packages/core/src/l0/entries.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L68)

Seq of the class-level EscalationDecision when by = 'class_decision'.

***

### logicalTaskId?

```ts
optional logicalTaskId?: string;
```

Defined in: [packages/core/src/l0/entries.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L70)

Lineage-fold attribution (DEF-3, M7).

***

### target

```ts
target: number;
```

Defined in: [packages/core/src/l0/entries.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L63)

Duplicates ref for self-description.

***

### value

```ts
value: Json;
```

Defined in: [packages/core/src/l0/entries.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L66)

awaitExternal resolution / EscalationDecision / WakeDigest.
