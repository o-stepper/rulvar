---
'@rulvar/core': minor
'@rulvar/cli': minor
---

Every tool event names its call (RV908, the thirteenth experiment's OTel attribution risk). `tool:start` and `tool:end` gain `toolCallId`, the model-minted id the journal's messages and tool-result parts have always carried: present on every live event and on every replayed reconstruction (the id rides the checkpoint's tool-result parts, so even journals written before this release name their calls on resume), absent only on streams recorded before RV908 or written by foreign emitters.

The OTel exporter pairs tool spans EXACTLY by the id (stamped as `rulvar.tool.call_id`), so concurrent same-name calls that finish out of order keep their own durations and outcomes instead of FIFO-swapping attribution. Streams without the field keep the historical FIFO pairing byte for byte, an id-bearing `tool:end` whose start carried no id falls back to the same FIFO (mixed streams pair no worse than before), and the orphan tolerance (a closer with no open start attaches as a span event) is unchanged.
