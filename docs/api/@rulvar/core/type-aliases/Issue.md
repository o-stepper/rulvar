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

Defined in: [packages/core/src/l0/errors.ts:357](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L357)

The vendored Standard Schema issue shape: validation issues carried
on AgentError and surfaced to the
model during bounded schema re-prompts.

## Properties

### message

```ts
message: string;
```

Defined in: [packages/core/src/l0/errors.ts:358](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L358)

***

### path?

```ts
optional path?: ReadonlyArray<
  | PropertyKey
  | {
  key: PropertyKey;
}>;
```

Defined in: [packages/core/src/l0/errors.ts:359](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L359)
