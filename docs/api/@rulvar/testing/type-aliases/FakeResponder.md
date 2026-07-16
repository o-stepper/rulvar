[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / FakeResponder

# Type Alias: FakeResponder

```ts
type FakeResponder = string | ((call) => unknown) | object;
```

Defined in: [packages/testing/src/fake-adapter.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/fake-adapter.ts#L34)

A static string (plain text output), a static value (structured output),
or a function of the call. Thrown errors become terminal error events.
fakeToolCalls() and fakeWireError() values script tool-calling turns and
typed wire failures (M3).
