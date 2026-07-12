---
'@rulvar/anthropic': patch
'@rulvar/bridge-ai-sdk': patch
'@rulvar/cli': patch
'@rulvar/core': patch
'@rulvar/evals': patch
'@rulvar/rulvar': patch
'@rulvar/openai': patch
'@rulvar/plan': patch
'@rulvar/planner': patch
'@rulvar/store-conformance': patch
'@rulvar/store-sqlite': patch
'@rulvar/testing': patch
'eslint-plugin-rulvar': patch
---

TSDoc and inline comments no longer cite the retired internal specification set (the pre-docs-site `docs/NN, section ...` references). The citations either became links to the public documentation at docs.rulvar.com or were dropped where the comment already carried the rule; traceability markers (DEF-n, XF-nn, FR-nnn, OQ-nn, W-nnn) are untouched. Comment-only change: no runtime behavior, no API shapes, and no runtime message strings were modified; the frozen golden-fold fixture is byte-identical.
