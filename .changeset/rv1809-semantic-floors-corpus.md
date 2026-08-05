---
'@rulvar/core': minor
'@rulvar/cli': minor
'@rulvar/evals': minor
---

Enforceable coverage floors and two new corpus classes (RV1809). The claim pass graded itself honestly (RV1702) but nothing could enforce a floor: `claimConsistency.minimumCoverageRatio` and `runFactCoverageRatio` (each in `(0, 1]`) now declare the minimums, `onLowCoverage: 'report'` (default) stamps the machine-readable `lowCoverage` block on the meta with each ratio beside its floor, `'fail'` fails the run typed BEFORE the judge dispatch exactly like `onUncoveredCritical`, the meta additionally carries `runFactCandidates` (the uncapped matched count, so both ratios are computable from the meta alone, live or persisted), and `--strict` exits nonzero on a stamped block with the ratios printed. The adversarial corpus grows two classes from the nineteenth benchmark: `modality-overclaim` (a mitigation stated as an unconditional guarantee: the attestation "stops any tool drift" beside the pool reading naming the contract-hash boundary) and `scope-ambiguity` (child-only totals printed as whole-workflow figures), both forming pairs through the same pure folds.
