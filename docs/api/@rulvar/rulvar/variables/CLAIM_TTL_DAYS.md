[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / CLAIM\_TTL\_DAYS

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

Defined in: `packages/core/dist/index.d.ts`

The asymmetric TTL table:
a false negative is costlier through lock-in, so weaknesses expire
sooner than strengths.

## Type Declaration

| Name | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-eval-measured"></a> `eval-measured` | \{ `strength`: `90`; `weakness`: `30`; \} | `packages/core/dist/index.d.ts` |
| `eval-measured.strength` | `90` | `packages/core/dist/index.d.ts` |
| `eval-measured.weakness` | `30` | `packages/core/dist/index.d.ts` |
| <a id="property-human-editorial"></a> `human-editorial` | \{ `strength`: `120`; `weakness`: `45`; \} | `packages/core/dist/index.d.ts` |
| `human-editorial.strength` | `120` | `packages/core/dist/index.d.ts` |
| `human-editorial.weakness` | `45` | `packages/core/dist/index.d.ts` |
