[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResolutionPayload

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

Defined in: [packages/core/src/l0/entries.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L62)

Payload of resolution ref-entries (docs/03, section 8.6; DEF-4).

## Properties

### by

```ts
by: ResolutionBy;
```

Defined in: [packages/core/src/l0/entries.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L65)

***

### countsAgainstLimit?

```ts
optional countsAgainstLimit?: boolean;
```

Defined in: [packages/core/src/l0/entries.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L73)

Only on escalation resolutions (DEF-3, M7).

***

### decisionRef?

```ts
optional decisionRef?: number;
```

Defined in: [packages/core/src/l0/entries.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L69)

Seq of the class-level EscalationDecision when by = 'class_decision'.

***

### logicalTaskId?

```ts
optional logicalTaskId?: string;
```

Defined in: [packages/core/src/l0/entries.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L71)

Lineage-fold attribution (DEF-3, M7).

***

### target

```ts
target: number;
```

Defined in: [packages/core/src/l0/entries.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L64)

Duplicates ref for self-description.

***

### value

```ts
value: Json;
```

Defined in: [packages/core/src/l0/entries.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L67)

awaitExternal resolution / EscalationDecision / WakeDigest.
