[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RandPayload

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

Defined in: [packages/core/src/l0/entries.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L154)

Rand-entry payload (docs/03, section "Normative payload schemas").
