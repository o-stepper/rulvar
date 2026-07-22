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

Defined in: [packages/core/src/l0/errors.ts:336](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L336)

The vendored Standard Schema issue shape: validation issues carried
on AgentError and surfaced to the
model during bounded schema re-prompts.

## Properties

### message

```ts
message: string;
```

Defined in: [packages/core/src/l0/errors.ts:337](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L337)

***

### path?

```ts
optional path?: ReadonlyArray<
  | PropertyKey
  | {
  key: PropertyKey;
}>;
```

Defined in: [packages/core/src/l0/errors.ts:338](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L338)
