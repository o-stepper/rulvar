/**
 * Structured output in three tiers (M1-T06): native json_schema,
 * forced-tool, and prompt, with client-side validation behind all three.
 *
 * Full contract: https://docs.rulvar.com/guide/agents (runtime binding)
 * and https://docs.rulvar.com/guide/providers (tier selection).
 */
import type { Issue } from '../l0/errors.js';
import type { ChatRequest, JsonSchema, Msg, ToolContract } from '../l0/messages.js';
import type { StructuredOutputTier } from '../model/caps.js';

/** The synthesized forced-tool contract name. */
export const EMIT_RESULT_TOOL = 'emit_result';

/**
 * Applies the selected tier to an outgoing request. Native rides
 * ChatRequest.schema; forced-tool synthesizes a single emit_result tool
 * with toolChoice pinned to it; prompt injects the schema into the last
 * user message.
 */
export function applyStructuredOutputTier(
  req: ChatRequest,
  tier: StructuredOutputTier,
  schema: JsonSchema,
): ChatRequest {
  if (tier === 'native') {
    return { ...req, schema };
  }
  if (tier === 'forced-tool') {
    const contract: ToolContract = {
      name: EMIT_RESULT_TOOL,
      description: 'Emit the final structured result. Call exactly once with the complete answer.',
      parameters: schema,
    };
    return {
      ...req,
      tools: [...(req.tools ?? []), contract],
      toolChoice: { name: EMIT_RESULT_TOOL },
    };
  }
  const instruction =
    'Respond with a single JSON value that validates against this JSON Schema, ' +
    'with no surrounding prose and no code fences:\n' +
    JSON.stringify(schema);
  const messages = [...req.messages];
  const last = messages[messages.length - 1];
  if (last !== undefined && last.role === 'user') {
    messages[messages.length - 1] = {
      role: 'user',
      parts: [...last.parts, { type: 'text', text: instruction }],
    };
  } else {
    messages.push({ role: 'user', parts: [{ type: 'text', text: instruction }] });
  }
  return { ...req, messages };
}

/** One collected model turn, assembled from the stream by the agent loop. */
export interface CollectedTurn {
  text: string;
  toolCalls: Array<{ id: string; name: string; args: unknown }>;
}

/**
 * Extracts the structured-output candidate from a collected turn per tier.
 * Returns `undefined` when the turn carries no candidate (for example the
 * model answered prose without the forced tool call).
 */
export function extractCandidate(
  turn: CollectedTurn,
  tier: StructuredOutputTier,
): { raw: unknown } | undefined {
  if (tier === 'forced-tool') {
    const call = turn.toolCalls.find((c) => c.name === EMIT_RESULT_TOOL);
    return call === undefined ? undefined : { raw: call.args };
  }
  const text = turn.text.trim();
  if (text === '') {
    return undefined;
  }
  try {
    return { raw: JSON.parse(text) };
  } catch {
    const extracted = extractFirstJsonValue(text);
    return extracted === undefined ? undefined : { raw: extracted };
  }
}

/** Best-effort extraction of the first complete JSON object or array in prose. */
function extractFirstJsonValue(text: string): unknown {
  const start = text.search(/[[{]/);
  if (start === -1) {
    return undefined;
  }
  const open = text[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === open) {
      depth += 1;
    } else if (ch === close) {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return undefined;
        }
      }
    }
  }
  return undefined;
}

/** The bounded re-prompt message sent back to the model on a validation miss. */
export function formatRePrompt(issues: Issue[], attempt: number, maxAttempts: number): Msg {
  const lines = issues
    .slice(0, 16)
    .map((issue) => {
      const path =
        issue.path === undefined || issue.path.length === 0
          ? ''
          : ` (at ${issue.path.map((seg) => String(typeof seg === 'object' ? seg.key : seg)).join('.')})`;
      return `- ${issue.message}${path}`;
    })
    .join('\n');
  return {
    role: 'user',
    parts: [
      {
        type: 'text',
        text:
          `Your previous answer did not validate against the required schema ` +
          `(attempt ${attempt} of ${maxAttempts}). Issues:\n${lines}\n` +
          'Respond again with ONLY a corrected JSON value that validates.',
      },
    ],
  };
}
