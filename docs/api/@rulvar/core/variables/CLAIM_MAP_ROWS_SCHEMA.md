[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CLAIM\_MAP\_ROWS\_SCHEMA

# Variable: CLAIM\_MAP\_ROWS\_SCHEMA

```ts
const CLAIM_MAP_ROWS_SCHEMA: SchemaSpec;
```

Defined in: [packages/core/src/orchestrator/claim-map.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/claim-map.ts#L57)

The claimMap rows' JSON schema fragment (RV4305): shape and bounds
only. The RELATIONAL rules (anchor bidirectionality, one non-source
row per anchor, per-grade required blocks) are
[validateClaimMapStructure](/api/@rulvar/core/functions/validateClaimMapStructure.md)'s, because a JSON schema cannot
read the document the map describes.
