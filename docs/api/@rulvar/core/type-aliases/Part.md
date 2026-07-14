[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Part

# Type Alias: Part

```ts
type Part = 
  | {
  text: string;
  type: "text";
}
  | {
  data: Uint8Array | string;
  mediaType: string;
  type: "image";
}
  | {
  args: unknown;
  id: CanonicalId;
  name: string;
  type: "tool-call";
}
  | {
  id: CanonicalId;
  isError?: boolean;
  name: string;
  result: unknown;
  type: "tool-result";
}
  | {
  block: unknown;
  provider: string;
  type: "provider-raw";
};
```

Defined in: [packages/core/src/l0/messages.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L44)

The canonical part union. provider-raw parts carry opaque provider blocks
that must survive round trips (thinking blocks with signatures, reasoning
items including encrypted_content). Retention is unconditional; dropping
happens only in projection, never in retention.
