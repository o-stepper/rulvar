[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RESEARCH\_PROFILE\_LIMITS

# Variable: RESEARCH\_PROFILE\_LIMITS

```ts
const RESEARCH_PROFILE_LIMITS: UsageLimits;
```

Defined in: [packages/core/src/engine/profile-templates.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/profile-templates.ts#L36)

The research template's stop conditions: a weighted unit budget over
the research tools (bookkeeping tools are free), per-tool caps, both
repetition guards, and soft budget notices. Exported so hosts and
tests can read the exact defaults they are overriding.
