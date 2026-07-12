[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AbandonAttempt

# Type Alias: AbandonAttempt

```ts
type AbandonAttempt = {
  authorizedBy: number;
  logicalTaskId?: string;
  nodeId?: string;
  reason: string;
  retainCheckpoint?: boolean;
  retainWorktree?: boolean;
  target: number;
};
```

Defined in: [packages/core/src/journal/resolution.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L26)

## Properties

### authorizedBy

```ts
authorizedBy: number;
```

Defined in: [packages/core/src/journal/resolution.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L28)

***

### logicalTaskId?

```ts
optional logicalTaskId?: string;
```

Defined in: [packages/core/src/journal/resolution.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L31)

Lineage-fold attribution (XF-04; DEF-3).

***

### nodeId?

```ts
optional nodeId?: string;
```

Defined in: [packages/core/src/journal/resolution.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L29)

***

### reason

```ts
reason: string;
```

Defined in: [packages/core/src/journal/resolution.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L32)

***

### retainCheckpoint?

```ts
optional retainCheckpoint?: boolean;
```

Defined in: [packages/core/src/journal/resolution.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L33)

***

### retainWorktree?

```ts
optional retainWorktree?: boolean;
```

Defined in: [packages/core/src/journal/resolution.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L34)

***

### target

```ts
target: number;
```

Defined in: [packages/core/src/journal/resolution.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L27)
