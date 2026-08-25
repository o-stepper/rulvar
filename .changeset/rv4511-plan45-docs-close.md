---
'@rulvar/core': patch
---

Plan 45 closes in the documentation (RV4511): the model-routing page records the limiter/admission split as load bearing (the limiter answers "may this wire fly right now", the durable admission seam answers "when may this work START and in what order", a granted ticket never exempts a wire from quota), the durability page documents the run bracket's crash model (recover by unit identity, re-admission of settled units, conservative expiry settlement through fenced covers, nothing journaled), and rfcs/admission.md records the implemented status with its deviations and first shapes named one by one, mirroring rfcs/effects.md. Both RFCs now read as shipped protocol references rather than promises.
