---
'@rulvar/core': minor
---

`claimConsistency.stage 'final'` with `onFound: 'carry'` is now a ConfigError at intake (RV3301). The carry posture rides the 'single' synthesis prompt, and the final pass runs strictly after that prompt was built and consumed, so the pair read as a gate while behaving as 'report': the 2026-08-12 comparison run settled ok/complete with a contradiction its own final judge had already named. Under `stage: 'both'` the carry keeps binding the draft pass, whose findings the synthesis prompt still lies ahead of, and the final pass reports; `stage: 'draft'` with 'carry' stays byte identical. Hosts that armed the refused pair should pick 'report' (the previous effective behavior, now named), 'fail', or a carried draft pass via 'both'.
