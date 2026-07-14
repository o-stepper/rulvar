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

Defined in: [packages/core/src/l0/entries.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L75)

Payload of abandon ref-entries (DEF-4/DEF-5).

## Properties

### authorizedBy

```ts
authorizedBy: number;
```

Defined in: [packages/core/src/l0/entries.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L79)

Seq of the plan.revision or decision entry sanctioning it.

***

### logicalTaskId?

```ts
optional logicalTaskId?: string;
```

Defined in: [packages/core/src/l0/entries.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L81)

***

### nodeId?

```ts
optional nodeId?: string;
```

Defined in: [packages/core/src/l0/entries.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L80)

***

### reason

```ts
reason: string;
```

Defined in: [packages/core/src/l0/entries.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L82)

***

### retainCheckpoint?

```ts
optional retainCheckpoint?: boolean;
```

Defined in: [packages/core/src/l0/entries.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L84)

Default true (DEF-5).

***

### retainWorktree?

```ts
optional retainWorktree?: boolean;
```

Defined in: [packages/core/src/l0/entries.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L86)

Default false; counts against the pin cap (DEF-5).

***

### target

```ts
target: number;
```

Defined in: [packages/core/src/l0/entries.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L77)

Seq of the abandoned branch's spawn entry.
