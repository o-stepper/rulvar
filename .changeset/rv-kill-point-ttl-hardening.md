---
'@rulvar/store-conformance': patch
---

Kill-point suite hardening against loaded test runners: the worker's default lease ttl rises from 300 ms to 2000 ms, because a scheduler stall past the ttl between the worker's own renewals cancels the run by contract BEFORE the kill point is reached (the worker then exits zero as ran-to-completion and the scenario reads a self-inflicted takeover as a violation); the referee's post-kill wait is now the resume retry loop itself (each attempt against a live lease rejects typed with zero writes, so polling is free) instead of a fixed sleep; and the ran-to-completion violation names the worker's settled status for diagnosability. Only the killed owner is short-leased; referees and successor instances belong on their store's generous default ttl.
