---
'@rulvar/testing': minor
---

`readCassette` now validates the nested structures of every row, not only field presence: the request must be a plain object (an array was accepted), every event must be a member of the canonical `ChatEvent` vocabulary with its required payload and the numeric Usage invariants (a null element used to crash replay with a raw `TypeError`, and a bare `{ type: 'finish' }` reached the engine and died there on the missing usage), and caps must carry every `ModelCaps` field, with the optional pricing table checked when present (an empty object passed as a snapshot). Failures throw a typed `ConfigError` naming the cassette path, the JSONL line, and the field path. Unknown extra fields stay tolerated for forward compatibility; an unknown event type is refused. Event stream semantics (exactly one trailing terminal per row) and adapter consistency across rows stay `replay` build concerns, so reading never blocks inspecting a well formed file.
