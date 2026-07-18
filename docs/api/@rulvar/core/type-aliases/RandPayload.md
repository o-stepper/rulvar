[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RandPayload

# Type Alias: RandPayload

```ts
type RandPayload = 
  | {
  subtype: "now";
  value: number;
}
  | {
  key?: string;
  subtype: "random";
  value: number;
}
  | {
  subtype: "uuid";
  value: string;
};
```

Defined in: [packages/core/src/l0/entries.ts:253](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L253)

Rand-entry payload.
