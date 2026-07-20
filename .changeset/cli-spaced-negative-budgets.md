---
'@rulvar/cli': minor
---

The documented spaced syntax of numeric flags now reaches the canonical validation for negative values: `rulvar run wf --budget-usd -1` reports `--budget-usd must be a positive number` instead of the generic parseArgs ambiguity error (v1.27.0 review P3). The fold applies only to strictly numeric negative tokens after a numeric flag (`--budget-usd`, `--planning-budget-usd`); unknown option, duplicate flag, and missing value diagnostics are unchanged.
