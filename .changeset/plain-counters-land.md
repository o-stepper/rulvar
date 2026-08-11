---
'@rulvar/core': minor
---

Terminal agent entries journal the durable tool-budget subset (RV3002): `toolBudget: { used, cap? }`, the loop's executed-call counter and the effective cap at settle, written whenever the live result carried the pressure snapshot. The counter has always been durable in the terminal checkpoint, but checkpoints are blobs and journal folds read entries only, so observed calls-per-evidence-entry calibration could not be a pure fold. Replay now restores `AgentResult.toolBudget` unconditionally from the entry on new journals, grant-free runs included, with the RV509 decision-backed fields (`extensionsGranted`, `finalizationWindowEntered`) merged on top; journals written before the field shipped keep the RV509 decision-conditional restoration byte for byte. Live-only summary fields (`unitsUsed`, `noticesFired`, `limiter`, and the rest) never journal, exactly as before.
