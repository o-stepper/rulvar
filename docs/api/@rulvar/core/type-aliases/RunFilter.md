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

Defined in: [packages/core/src/l0/spi/store.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L100)

## Properties

### name?

```ts
optional name?: string;
```

Defined in: [packages/core/src/l0/spi/store.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L112)

***

### status?

```ts
optional status?: string;
```

Defined in: [packages/core/src/l0/spi/store.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L101)

***

### statuses?

```ts
optional statuses?: string[];
```

Defined in: [packages/core/src/l0/spi/store.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L110)

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

Defined in: [packages/core/src/l0/spi/store.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L111)
