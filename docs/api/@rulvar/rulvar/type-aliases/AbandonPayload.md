[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AbandonPayload

# Type Alias: AbandonPayload

```ts
type AbandonPayload = {
  authorizedBy: number;
  logicalTaskId?: string;
  nodeId?: string;
  reason: string;
  retainCheckpoint?: boolean;
  retainWorktree?: boolean;
  target: number;
};
```

Defined in: `packages/core/dist/index.d.ts`

Payload of abandon ref-entries (DEF-4/DEF-5).

## Properties

### authorizedBy

```ts
authorizedBy: number;
```

Defined in: `packages/core/dist/index.d.ts`

***

### logicalTaskId?

```ts
optional logicalTaskId?: string;
```

Defined in: `packages/core/dist/index.d.ts`

***

### nodeId?

```ts
optional nodeId?: string;
```

Defined in: `packages/core/dist/index.d.ts`

***

### reason

```ts
reason: string;
```

Defined in: `packages/core/dist/index.d.ts`

***

### retainCheckpoint?

```ts
optional retainCheckpoint?: boolean;
```

Defined in: `packages/core/dist/index.d.ts`

***

### retainWorktree?

```ts
optional retainWorktree?: boolean;
```

Defined in: `packages/core/dist/index.d.ts`

***

### target

```ts
target: number;
```

Defined in: `packages/core/dist/index.d.ts`

Seq of the abandoned branch's spawn entry.
