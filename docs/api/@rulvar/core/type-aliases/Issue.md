[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Issue

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

Defined in: [packages/core/src/l0/errors.ts:476](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L476)

The vendored Standard Schema issue shape: validation issues carried
on AgentError and surfaced to the
model during bounded schema re-prompts.

## Properties

### message

```ts
message: string;
```

Defined in: [packages/core/src/l0/errors.ts:477](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L477)

***

### path?

```ts
optional path?: ReadonlyArray<
  | PropertyKey
  | {
  key: PropertyKey;
}>;
```

Defined in: [packages/core/src/l0/errors.ts:478](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L478)
