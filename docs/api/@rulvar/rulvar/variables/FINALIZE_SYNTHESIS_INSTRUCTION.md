[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / FINALIZE\_SYNTHESIS\_INSTRUCTION

# Variable: FINALIZE\_SYNTHESIS\_INSTRUCTION

```ts
const FINALIZE_SYNTHESIS_INSTRUCTION: string;
```

Defined in: `packages/core/dist/index.d.ts`

The deterministic synthesis instruction appended (as a user message)
to the finalize REQUEST only, never to the durable transcript. A
transcript that simply ends at an assistant message reads to a real
model as a fresh conversation opening, so an uninstructed synthesis
call can replace the loop's correct answer with a greeting (v1.18.0
review P1-1); the extract arm has carried its own instruction since
M4, and this is its finalize twin. The wording is part of the wire
request: keep it stable.
