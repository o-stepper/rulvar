---
'@rulvar/anthropic': patch
---

The second Haiku 4.5 wire incompatibility (the first live probe after the caps entry): the model also rejects the top-level effort parameter with a 400, so its capability entry now declares empty reasoningEfforts and the router scrubs effort off the wire (the requested effort stays in identity). Verified live: a haiku run completes ok.
