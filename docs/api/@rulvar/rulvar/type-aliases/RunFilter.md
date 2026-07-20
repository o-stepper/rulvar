[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RunFilter

# Type Alias: RunFilter

```ts
type RunFilter = {
  name?: string;
  status?: string;
  statuses?: string[];
  tags?: string[];
};
```

Defined in: `packages/core/dist/index.d.ts`

## Properties

### name?

```ts
optional name?: string;
```

Defined in: `packages/core/dist/index.d.ts`

***

### status?

```ts
optional status?: string;
```

Defined in: `packages/core/dist/index.d.ts`

***

### statuses?

```ts
optional statuses?: string[];
```

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`
