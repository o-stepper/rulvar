[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / MAX\_RUN\_ID\_LENGTH

# Variable: MAX\_RUN\_ID\_LENGTH

```ts
const MAX_RUN_ID_LENGTH: 200 = 200;
```

Defined in: `packages/core/dist/index.d.ts`

The runId length ceiling (RV1012): a runId is a filesystem name
component and a correlation key, so the cap keeps it comfortably
under filesystem name limits with room for store suffixes, and
starves length-based smuggling through the unmasked id channel.
