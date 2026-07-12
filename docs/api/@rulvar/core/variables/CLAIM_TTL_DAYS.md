[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CLAIM\_TTL\_DAYS

# Variable: CLAIM\_TTL\_DAYS

```ts
const CLAIM_TTL_DAYS: {
  eval-measured: {
     strength: 90;
     weakness: 30;
  };
  human-editorial: {
     strength: 120;
     weakness: 45;
  };
};
```

Defined in: [packages/core/src/knowledge/decay.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/decay.ts#L18)

The asymmetric TTL table (docs/05, section "Grounding and decay"):
a false negative is costlier through lock-in, so weaknesses expire
sooner than strengths.

## Type Declaration

| Name | Type | Default value | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-eval-measured"></a> `eval-measured` | \{ `strength`: `90`; `weakness`: `30`; \} | - | [packages/core/src/knowledge/decay.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/decay.ts#L19) |
| `eval-measured.strength` | `90` | `90` | [packages/core/src/knowledge/decay.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/decay.ts#L19) |
| `eval-measured.weakness` | `30` | `30` | [packages/core/src/knowledge/decay.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/decay.ts#L19) |
| <a id="property-human-editorial"></a> `human-editorial` | \{ `strength`: `120`; `weakness`: `45`; \} | - | [packages/core/src/knowledge/decay.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/decay.ts#L20) |
| `human-editorial.strength` | `120` | `120` | [packages/core/src/knowledge/decay.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/decay.ts#L20) |
| `human-editorial.weakness` | `45` | `45` | [packages/core/src/knowledge/decay.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/decay.ts#L20) |
