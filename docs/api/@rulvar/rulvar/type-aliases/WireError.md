[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / WireError

# Type Alias: WireError

```ts
type WireError = {
  code: string;
  data?: Json;
  message: string;
  retryable: boolean;
};
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

JSON-serializable error projection stored in journal entries
(JournalEntry.error) and sent across process boundaries (worker sandbox
RPC, HTTP server). Raw Error objects never enter the journal.

## Properties

### code

```ts
code: string;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

***

### data?

```ts
optional data?: Json;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

***

### message

```ts
message: string;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

***

### retryable

```ts
retryable: boolean;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)
