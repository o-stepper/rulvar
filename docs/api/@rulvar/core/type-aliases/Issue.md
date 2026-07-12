[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Issue

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

Defined in: [packages/core/src/l0/errors.ts:320](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L320)

The vendored Standard Schema issue shape (docs/06, section "Canonical Ctx
interface"): validation issues carried on AgentError and surfaced to the
model during bounded schema re-prompts.

## Properties

### message

```ts
message: string;
```

Defined in: [packages/core/src/l0/errors.ts:321](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L321)

***

### path?

```ts
optional path?: ReadonlyArray<
  | PropertyKey
  | {
  key: PropertyKey;
}>;
```

Defined in: [packages/core/src/l0/errors.ts:322](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L322)
