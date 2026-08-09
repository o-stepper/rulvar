[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / IN\_FLIGHT\_EXPOSURE\_REFUSAL\_PREFIX

# Variable: IN\_FLIGHT\_EXPOSURE\_REFUSAL\_PREFIX

```ts
const IN_FLIGHT_EXPOSURE_REFUSAL_PREFIX: "in flight exposure cap reached" = 'in flight exposure cap reached';
```

Defined in: [packages/core/src/engine/budget.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L67)

The message prefix of an in-flight exposure refusal (RV711): the
single producer is reserveTurnExposure below, and the ctx layer's
uniform budget rethrow keys on it to carry the refusal through with
its own honest arithmetic instead of claiming a ceiling crossed
(no account closes on a transient refusal).
