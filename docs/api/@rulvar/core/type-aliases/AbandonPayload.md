[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AbandonPayload

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

Defined in: [packages/core/src/l0/entries.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L76)

Payload of abandon ref-entries (DEF-4/DEF-5).

## Properties

### authorizedBy

```ts
authorizedBy: number;
```

Defined in: [packages/core/src/l0/entries.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L80)

Seq of the plan.revision or decision entry sanctioning it.

***

### logicalTaskId?

```ts
optional logicalTaskId?: string;
```

Defined in: [packages/core/src/l0/entries.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L82)

***

### nodeId?

```ts
optional nodeId?: string;
```

Defined in: [packages/core/src/l0/entries.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L81)

***

### reason

```ts
reason: string;
```

Defined in: [packages/core/src/l0/entries.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L83)

***

### retainCheckpoint?

```ts
optional retainCheckpoint?: boolean;
```

Defined in: [packages/core/src/l0/entries.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L85)

Default true (DEF-5).

***

### retainWorktree?

```ts
optional retainWorktree?: boolean;
```

Defined in: [packages/core/src/l0/entries.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L87)

Default false; counts against the pin cap (DEF-5).

***

### target

```ts
target: number;
```

Defined in: [packages/core/src/l0/entries.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L78)

Seq of the abandoned branch's spawn entry.
