[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/effects](/api/@rulvar/effects/index.md) / EffectLookupAnswer

# Type Alias: EffectLookupAnswer

```ts
type EffectLookupAnswer = 
  | {
  found: true;
  receipt: EffectReceiptObservation;
}
  | {
  acceptanceClosed: boolean;
  found: false;
};
```

Defined in: [packages/effects/src/adapter.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L77)

## Union Members

### Type Literal

```ts
{
  found: true;
  receipt: EffectReceiptObservation;
}
```

***

### Type Literal

```ts
{
  acceptanceClosed: boolean;
  found: false;
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `acceptanceClosed` | `boolean` | True only when the negative is provider-enforced FINAL: the specific effect is not accepted and can no longer BE accepted (RFC section 6). An eventually consistent miss is `false`. | [packages/effects/src/adapter.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L86) |
| `found` | `false` | - | [packages/effects/src/adapter.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L80) |
