/**
 * HistoryProjector (M4-T02): projection of the canonical history into a
 * target provider's wire view, and the retention lift that puts provider
 * blocks INTO that history in the first place.
 *
 * The rules, as amended:
 *
 * - provider-raw parts are retained in canonical history unconditionally;
 * - a projection includes a provider-raw part if and only if the target
 *   adapter's PROVIDER family matches the part's `provider` field
 *   (provider granularity, never model granularity: the server handles
 *   cross-model drops; client-side per-model stripping is forbidden);
 * - provider-raw parts of a different provider are omitted from the
 *   projection, and only from the projection;
 * - adapters ship a turn's blocks-to-retain in stream order via
 *   finish.providerMetadata[<adapter id>].retainedParts; the runtime
 *   lifts them into provider-raw parts tagged with the adapter's
 *   provider name, prepended at the HEAD of the turn's assistant message
 *   (on both first-class providers the retained blocks precede the
 *   turn's text and tool calls).
 *
 * The canonical-id maps are adapter-instance
 * state: each adapter keeps its bijection between canonical ids and its
 * own wire ids for its lifetime, fabricating deterministic wire ids for
 * canonical ids minted by another provider. This module owns the
 * projection rule and the lift; the agent loop projects EVERY outgoing
 * request so loop, finalize, and extract each see a valid wire history.
 */
import type { Msg, Part } from '../l0/messages.js';
import type { ProviderAdapter } from '../l0/spi/provider.js';

/** The provider family of an adapter: `provider` when set, else `id`. */
export function providerOf(adapter: Pick<ProviderAdapter, 'id' | 'provider'>): string {
  return adapter.provider ?? adapter.id;
}

/**
 * Projects the canonical history into the target provider's view:
 * provider-raw parts of a DIFFERENT provider are omitted; everything
 * else (text, images, tool calls, tool results, compaction content)
 * passes through untouched. Messages whose parts all belong to another
 * provider vanish entirely rather than ride as empty messages.
 */
export function projectHistory(messages: Msg[], targetProvider: string): Msg[] {
  const projected: Msg[] = [];
  for (const msg of messages) {
    const parts = msg.parts.filter(
      (part) => part.type !== 'provider-raw' || part.provider === targetProvider,
    );
    if (parts.length === 0 && msg.parts.length > 0) {
      continue;
    }
    projected.push(parts.length === msg.parts.length ? msg : { ...msg, parts });
  }
  return projected;
}

/**
 * Lifts the adapter-shipped retention payload of one finished turn into
 * provider-raw parts (the retention transport). Reads
 * providerMetadata[<adapter id>].retainedParts and tags each block with
 * the adapter's provider family. Returns [] when the adapter shipped
 * nothing.
 */
export function liftRetainedParts(
  providerMetadata: Record<string, unknown> | undefined,
  adapter: Pick<ProviderAdapter, 'id' | 'provider'>,
): Part[] {
  const namespace = providerMetadata?.[adapter.id];
  if (typeof namespace !== 'object' || namespace === null) {
    return [];
  }
  const retained = (namespace as Record<string, unknown>).retainedParts;
  if (!Array.isArray(retained)) {
    return [];
  }
  const blocks: unknown[] = retained;
  const provider = providerOf(adapter);
  return blocks.map((block) => ({ type: 'provider-raw', provider, block }));
}
