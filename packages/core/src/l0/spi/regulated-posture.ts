/**
 * The construction-side posture attestation (RV4101; the debt RV4009
 * named). The regulated floor binds what flows through
 * CreateEngineOptions / RunOptions / OrchestrateOptions, but the
 * postures that decide whether a tool list can drift under a run or
 * whether a provider executes tools outside the permission chain live
 * on CONSTRUCTIONS: the mcp() source and the AI SDK bridge adapter.
 * RV4009 deliberately excluded them from the profile hash ("a hash
 * must not imply what it cannot verify") and named them in prose
 * beside the call. This descriptor makes them verifiable: a
 * risk-bearing construction exposes `describeRegulatedPosture()`, a
 * PURE snapshot of what was chosen at construction time (no wire, no
 * connect, no side effects), and `compileRegulatedProfile` walks the
 * constructions reachable from its options, refuses a loosened
 * posture naming the field, and folds the sorted descriptors into the
 * hashed posture map beside an `unrecognized` count of the
 * constructions that exposed nothing, so the hash names its own blind
 * spot instead of implying totality.
 *
 * The descriptor is a snapshot, not a lease, and the window between
 * compile time and use is held by re-assertion (RV4102, the RV1608
 * template): the compiled options wrap each attested construction so
 * every use of its risk seam (`tools()` on a source, `stream()` on an
 * adapter) re-reads and re-judges the descriptor, refusing a posture
 * that moved since compile. The cross-process half of the window
 * needs no wrapper: a mutated construction compiles to a different
 * profile hash, and the RV3210 resume assertion refuses it.
 */

/** The posture an mcp() tool source chose at construction (RV1516/RV1808). */
export interface McpSourceRegulatedPosture {
  /** Descriptor shape version; bumps when the meaning changes. */
  regulatedPosture: 1;
  kind: 'mcp-source';
  /** The source id (`mcp:stdio:<command>`, `mcp:http:<url>`, `mcp:inprocess`). */
  name: string;
  /** What a listChanged notification means for this source (RV1516). */
  drift: 'rekey' | 'refuse';
  /**
   * The discovery bounds (RV1808); `declared` is the all-four
   * predicate `requireBounds` enforces (maxTools, maxPages,
   * maxSchemaBytes, timeouts.discoveryMs), and the declared values
   * ride beside it so the profile hash moves when a bound moves.
   */
  bounds: {
    declared: boolean;
    maxTools?: number;
    maxPages?: number;
    maxSchemaBytes?: number;
    discoveryMs?: number;
  };
}

/** The posture a bridgeAiSdk() adapter chose at construction. */
export interface AiSdkBridgeRegulatedPosture {
  /** Descriptor shape version; bumps when the meaning changes. */
  regulatedPosture: 1;
  kind: 'ai-sdk-bridge';
  /** The adapter id. */
  name: string;
  /**
   * Whether provider-executed tool results are admitted past the
   * seam; 'allow' runs tools outside the permission chain and the
   * journal, which the regulated floor refuses.
   */
  providerExecutedTools: 'allow' | 'deny';
}

/**
 * The posture a first-party model adapter chose at construction
 * (RV4204, the sixth comparison experiment): before it, only mcp()
 * and the AI SDK bridge attested, so `unrecognized >= 1` on nearly
 * every real compile and a `require-recognized` floor was
 * unsatisfiable by construction. The risk seams a model adapter
 * actually owns are its egress (where the wire bytes go) and its
 * caps-refresh pagination bound; both enter the hashed posture map,
 * so a moved base URL or a dropped bound moves the fingerprint.
 */
export interface ModelAdapterRegulatedPosture {
  /** Descriptor shape version; bumps when the meaning changes. */
  regulatedPosture: 1;
  kind: 'model-adapter';
  /** The adapter id ('anthropic', 'openai'). */
  name: string;
  /**
   * Where the adapter's wire bytes go: the provider's official
   * endpoint, a declared base-URL override (its origin rides beside
   * this value so the hash pins the egress), or a preconstructed
   * client the adapter cannot see through, named honestly.
   */
  transport: 'official' | 'custom-base-url' | 'preconstructed-client';
  /** Present exactly under 'custom-base-url': the override's origin. */
  baseUrlOrigin?: string;
  /**
   * The caps-refresh pagination bound (RV2904), for adapters that
   * expose one: `declared` mirrors whether the host capped the sweep,
   * and the value rides beside it. Absent on adapters with no
   * declarable bound.
   */
  capsBound?: { declared: boolean; maxPages?: number };
}

/**
 * The posture an isolated tool executor chose at construction
 * (RV4204). The executor is the one construction that dispatches
 * HOST-SIDE effects, and the regulated floor requires its ledger: an
 * effect no ledger records is an effect nobody can reconcile, the
 * billingReceipts doctrine applied to tools.
 */
export interface ToolExecutorRegulatedPosture {
  /** Descriptor shape version; bumps when the meaning changes. */
  regulatedPosture: 1;
  kind: 'tool-executor';
  /** The reference flavor ('subprocess', 'container') or a host name. */
  name: string;
  /** Whether a ToolEffectLedger records every dispatch (intent first). */
  ledger: boolean;
  /** Host env names reaching the child, the exact allowlist. */
  allowEnv: readonly string[];
  /** The resolved per-call ceilings (defaults resolve at construction). */
  bounds: { timeoutMs: number; maxOutputBytes: number };
  /**
   * The isolation seam, per flavor: a subprocess names whether a
   * sandbox launcher wraps the command; a container names its network
   * mode and root-filesystem posture.
   */
  isolation:
    | { flavor: 'subprocess'; sandboxed: boolean }
    | { flavor: 'container'; network: string; readOnlyRoot: boolean };
}

/** What `describeRegulatedPosture()` returns: one of the known shapes. */
export type RegulatedPostureDescriptor =
  | McpSourceRegulatedPosture
  | AiSdkBridgeRegulatedPosture
  | ModelAdapterRegulatedPosture
  | ToolExecutorRegulatedPosture;
