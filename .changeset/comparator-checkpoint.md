---
'@rulvar/core': minor
---

The rates comparator fails closed on page-only tiers and NaN, and the checkpoint decoder honors never-throws on top-level nulls (RV1007 + RV1008, PR IV of the fourteenth plan)

The fourteenth comparison experiment found two small holes in fail-closed surfaces. `compareRates` ran its tier comparison only when the SEED declared tiers, so a long-context premium the provider's page documents and the seed never declared produced no finding: exactly the silent underpricing channel the comparator's own doctrine names (the RV902 both-directions rule). Its scalar branch compared `Math.abs(a - b) > 1e-9`, and `NaN > epsilon` is false, so a page extraction that stopped parsing read as agreement. And `decodeCheckpoint` let `JSON.parse('null')` through the try/catch, then threw a raw `TypeError` on `parsed.v` out of a function whose documented contract is never-throws (the RV804 fix closed the nested shapes and left the top level open).

- `compareRates` (RV1007): a page-only tier list is now a finding (`tiers: the page shows N but the seed declares none`; an empty page list claims nothing), and scalars compare in the negated NaN-safe form the tier fields always used, so `NaN` on either side is a finding, never agreement.
- `decodeCheckpoint` (RV1008): a top-level payload that is not an object (`null`, a primitive, an array) decodes to `undefined` like every other malformed shape; the dangling dispatch reruns from the top, and the malformed corpus runs without a single throw.
