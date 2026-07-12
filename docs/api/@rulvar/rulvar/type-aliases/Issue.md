[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / Issue

# Type Alias: Issue

```ts
type Issue = {
  message: string;
  path?: ReadonlyArray<
     | PropertyKey
     | {
     key: PropertyKey;
  }>;
};
```

Defined in: `packages/core/dist/index.d.ts`

The vendored Standard Schema issue shape: validation issues carried
on AgentError and surfaced to the
model during bounded schema re-prompts.

## Properties

### message

```ts
message: string;
```

Defined in: `packages/core/dist/index.d.ts`

***

### path?

```ts
optional path?: ReadonlyArray<
  | PropertyKey
  | {
  key: PropertyKey;
}>;
```

Defined in: `packages/core/dist/index.d.ts`
