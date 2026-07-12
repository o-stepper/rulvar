[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RandPayload

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

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Rand-entry payload (docs/03, section "Normative payload schemas").
