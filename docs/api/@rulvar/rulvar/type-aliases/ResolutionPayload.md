[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ResolutionPayload

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

Defined in: `packages/core/dist/index.d.ts`

Payload of resolution ref-entries (DEF-4).

## Properties

### by

```ts
by: ResolutionBy;
```

Defined in: `packages/core/dist/index.d.ts`

***

### countsAgainstLimit?

```ts
optional countsAgainstLimit?: boolean;
```

Defined in: `packages/core/dist/index.d.ts`

***

### decisionRef?

```ts
optional decisionRef?: number;
```

Defined in: `packages/core/dist/index.d.ts`

***

### logicalTaskId?

```ts
optional logicalTaskId?: string;
```

Defined in: `packages/core/dist/index.d.ts`

***

### target

```ts
target: number;
```

Defined in: `packages/core/dist/index.d.ts`

Duplicates ref for self-description.

***

### value

```ts
value: Json;
```

Defined in: `packages/core/dist/index.d.ts`
