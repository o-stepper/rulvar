---
'@rulvar/anthropic': patch
---

The adapter scrubs constrained-decoding-unsupported keywords from the wire copy of strict tool schemas and output format schemas (`minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`, `maxItems`; measured live, docs/04 section 4.3 as amended). The orchestrator's spawn tools carry integer minimums, so every live orchestrate run died with a pre-first-call 400 ("For 'integer' type, property 'minimum' is not supported") at zero cost, which is what kept criterion 2 of the M12 checkpoint unmeasurable. The engine-side schema stays unscrubbed and still validates tool args and structured output, so the dropped keywords remain enforced; only the model-side hint is lost.
