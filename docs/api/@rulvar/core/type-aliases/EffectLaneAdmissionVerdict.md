[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectLaneAdmissionVerdict

# Type Alias: EffectLaneAdmissionVerdict

```ts
type EffectLaneAdmissionVerdict = 
  | {
  ok: true;
}
  | {
  conjunct:   | "settled"
     | "status"
     | "completion"
     | "deliverableAccepted"
     | "productionAcceptable";
  ok: false;
  reason: string;
};
```

Defined in: [packages/core/src/effects/admissible.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/admissible.ts#L24)

## Union Members

### Type Literal

```ts
{
  ok: true;
}
```

***

### Type Literal

```ts
{
  conjunct:   | "settled"
     | "status"
     | "completion"
     | "deliverableAccepted"
     | "productionAcceptable";
  ok: false;
  reason: string;
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `conjunct` | \| `"settled"` \| `"status"` \| `"completion"` \| `"deliverableAccepted"` \| `"productionAcceptable"` | The first failed conjunct, by its RFC name. | [packages/core/src/effects/admissible.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/admissible.ts#L29) |
| `ok` | `false` | - | [packages/core/src/effects/admissible.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/admissible.ts#L27) |
| `reason` | `string` | - | [packages/core/src/effects/admissible.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/admissible.ts#L31) |
