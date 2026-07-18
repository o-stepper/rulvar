---
'@rulvar/evals': patch
---

`SpendEnvelope` rejects amounts at or above 2^49 micro-USD (about $562,949,953.42). The 4-ULP representation-noise window grows with magnitude and reaches half a micro-USD at that boundary, where the nearest integer stops being unique: a ceil debit could snap DOWN and admit an aggregate whose raw requests sum above the ceiling (the v1.19.0 review reproduced a sub-micro overshoot at a $570M cap). Out-of-domain caps and ceilings now throw a typed `ConfigError` that debits nothing. The class documents the exact input interpretation (a double within the noise window of an integer micro value IS that integer) and the honest raw-double bound (at most half a micro per admitted amount, the finest distinction double precision carries at the top of the domain); boundary and adversarial ULP-neighbor properties pin both.
