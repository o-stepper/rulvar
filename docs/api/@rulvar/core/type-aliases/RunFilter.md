[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunFilter

# Type Alias: RunFilter

```ts
type RunFilter = {
  name?: string;
  status?: string;
  statuses?: string[];
  tags?: string[];
};
```

Defined in: [packages/core/src/l0/spi/store.ts:204](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L204)

## Properties

### name?

```ts
optional name?: string;
```

Defined in: [packages/core/src/l0/spi/store.ts:216](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L216)

***

### status?

```ts
optional status?: string;
```

Defined in: [packages/core/src/l0/spi/store.ts:205](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L205)

***

### statuses?

```ts
optional statuses?: string[];
```

Defined in: [packages/core/src/l0/spi/store.ts:214](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L214)

Match any of these statuses (the resumable candidate sweep asks for
`['running', 'suspended']` in one query). Advisory optimization, not
a correctness gate: a store written before this field ignores it and
returns a superset, so callers re-check status on what comes back.
When both `status` and `statuses` are present, a meta matches if it
satisfies either.

***

### tags?

```ts
optional tags?: string[];
```

Defined in: [packages/core/src/l0/spi/store.ts:215](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L215)
