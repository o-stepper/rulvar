[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RESEARCH\_FAN\_OUT\_LIMITS

# Variable: RESEARCH\_FAN\_OUT\_LIMITS

```ts
const RESEARCH_FAN_OUT_LIMITS: UsageLimits;
```

Defined in: `packages/core/dist/index.d.ts`

The fan out template's stop conditions (RV4905): the research
template's, plus the finalization machinery a capped specialist
needs to end with a recorded summary instead of a cut. The window
reserves the last six calls for bookkeeping, widens for an
outstanding evidence deficit, and lands an allowlisted overrun
softly; the reserve grants the summary turn; the extension converts
remaining money into calls, proactively for an evidence deficit.
