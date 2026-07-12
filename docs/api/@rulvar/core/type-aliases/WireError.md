[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / WireError

# Type Alias: WireError

```ts
type WireError = {
  code: string;
  data?: Json;
  message: string;
  retryable: boolean;
};
```

Defined in: [packages/core/src/l0/errors.ts:16](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L16)

JSON-serializable error projection stored in journal entries
(JournalEntry.error) and sent across process boundaries (worker sandbox
RPC, HTTP server). Raw Error objects never enter the journal.

## Properties

### code

```ts
code: string;
```

Defined in: [packages/core/src/l0/errors.ts:17](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L17)

***

### data?

```ts
optional data?: Json;
```

Defined in: [packages/core/src/l0/errors.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L20)

***

### message

```ts
message: string;
```

Defined in: [packages/core/src/l0/errors.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L18)

***

### retryable

```ts
retryable: boolean;
```

Defined in: [packages/core/src/l0/errors.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L19)
