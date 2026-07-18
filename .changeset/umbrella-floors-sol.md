---
'@rulvar/rulvar': minor
---

`recommendedDefaults.floors` now admits `openai:gpt-5.6-sol` and its published exact alias `openai:gpt-5.6` for the `orchestrate` and `plan` roles. The allowlists had fallen behind the product recommendation: the rulvar.com quickstart routes the orchestrator at Sol, but a configuration combining that recommendation with the recommended floors was rejected before any provider call with a quality-floor violation. The weaker family siblings Terra and Luna stay deliberately floored out of the control-plane roles; worker roles (`loop`, `extract`) remain unfloored.
