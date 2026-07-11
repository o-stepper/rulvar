/**
 * Turn-boundary checkpoints (M3-T02): with a durable store, the runtime
 * writes a canonical-history checkpoint at the boundary of every agent
 * turn into TranscriptStore, so an approval and a crash both continue the
 * loop from the same turn without repaying turns and without re-invoking
 * tools. Between a tool's execution and the checkpoint write, tools are
 * at-least-once (idempotency recommendation documented in docs/08).
 *
 * The blob format is ENGINE-INTERNAL with a leading format byte for
 * future migration (docs/03, section "Checkpoints"; format OQ in
 * docs/14). Nothing in the format enters identity.
 */
import type { Msg, Part, Usage } from '../l0/messages.js';

/** Leading format byte of the v1 checkpoint blob. */
export const CHECKPOINT_FORMAT_V1 = 0x01;

/**
 * Mid-turn suspension state (M3-T03): the turn's already-executed tool
 * results plus the call awaiting an approval resolution, so resume
 * continues the SAME turn without re-running executed tools.
 */
export interface PendingToolTurn {
  /** tool-result parts already produced this turn, in execution order. */
  executed: Array<{ id: string; name: string; result: unknown; isError?: boolean }>;
  /** The model-issued call whose ask verdict suspended the turn. */
  awaiting: { id: string; name: string; args: unknown };
  /** Calls after the awaiting one, still to execute on resume. */
  remaining: Array<{ id: string; name: string; args: unknown }>;
}

/** The canonical-history snapshot at a turn boundary. */
export interface CheckpointState {
  v: 1;
  /** Canonical history up to and including the boundary. */
  messages: Msg[];
  /** Model turns already paid. */
  turns: number;
  /** Usage accumulated so far (not yet journaled: terminals carry totals). */
  usage: Usage;
  toolCallsUsed: number;
  schemaAttempts: number;
  /** Compaction points; producers arrive with M4-T03. */
  compaction: number[];
  /** Present while an ask suspension holds the turn open (M3-T03). */
  pending?: PendingToolTurn;
}

/** Deterministic checkpoint blob ref for an agent dispatch (running seq). */
export function checkpointRefFor(runId: string, runningSeq: number): string {
  return `${runId}/ckpt/${runningSeq}`;
}

const BYTES_MARKER = '__rulvarBytes';

function encodePart(part: Part): unknown {
  if (part.type === 'image' && part.data instanceof Uint8Array) {
    return { ...part, data: { [BYTES_MARKER]: Buffer.from(part.data).toString('base64') } };
  }
  return part;
}

function decodePart(raw: unknown): Part {
  const part = raw as Part & { data?: unknown };
  if (part.type === 'image') {
    const data: unknown = part.data;
    if (typeof data === 'object' && data !== null && BYTES_MARKER in data) {
      const b64 = (data as Record<string, string>)[BYTES_MARKER];
      return { ...part, data: new Uint8Array(Buffer.from(b64, 'base64')) };
    }
  }
  return part;
}

/** Serializes a checkpoint to its blob: format byte then UTF-8 JSON. */
export function encodeCheckpoint(state: CheckpointState): Uint8Array {
  const wire = {
    ...state,
    messages: state.messages.map((msg) => ({
      role: msg.role,
      parts: msg.parts.map((part) => encodePart(part)),
    })),
  };
  const json = Buffer.from(JSON.stringify(wire), 'utf8');
  const blob = new Uint8Array(json.length + 1);
  blob[0] = CHECKPOINT_FORMAT_V1;
  blob.set(json, 1);
  return blob;
}

/**
 * Decodes a checkpoint blob. Returns undefined for an empty blob or an
 * unknown format byte: a resume never trusts a checkpoint it cannot
 * parse; the dangling dispatch reruns from the top instead (at-least-once
 * is the documented floor).
 */
export function decodeCheckpoint(blob: Uint8Array): CheckpointState | undefined {
  if (blob.length < 2 || blob[0] !== CHECKPOINT_FORMAT_V1) {
    return undefined;
  }
  let parsed: CheckpointState;
  try {
    parsed = JSON.parse(Buffer.from(blob.subarray(1)).toString('utf8')) as CheckpointState;
  } catch {
    return undefined;
  }
  if (parsed.v !== 1 || !Array.isArray(parsed.messages)) {
    return undefined;
  }
  return {
    ...parsed,
    messages: parsed.messages.map((msg) => ({
      role: msg.role,
      parts: msg.parts.map((part) => decodePart(part)),
    })),
  };
}
