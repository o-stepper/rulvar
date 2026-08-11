---
'@rulvar/core': minor
---

The MCP discovery deadline binds the page call itself (RV3205). `timeouts.discoveryMs` was checked only between pages, so a hung or slow CURRENT `tools/list` call was unbounded by it and the last (or only) page never paid the deadline at all: a single 86 ms page sailed under a 10 ms cap. Every page call now carries the smaller of `listMs` and the remaining discovery budget as its wire timeout, a page cut at the remaining budget reports in the discovery deadline's vocabulary with the transport failure as its cause, and sweeps that never approach the deadline are byte identical.
