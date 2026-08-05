/**
 * Toolset resolution and hashing (M3-T01): expands the per-spawn tools
 * array (ToolDef | ToolSource | string) into the spawn's toolset snapshot,
 * validates names and collisions, and derives toolsetHash from the
 * contracts only. A string entry names a registered toolset from
 * `createEngine({ defaults: { toolsets } })` (v1.17.0 review P1-3): the
 * registry snapshot belongs to the engine configuration, so the same
 * name expands identically for direct calls, agent profiles, and the
 * sandbox dialect, and an unknown name is a typed ConfigError at spawn
 * time, before any provider call. The snapshot is captured at spawn
 * time and stays stable for the agent's lifetime; provider-side drift
 * of a source's tools changes the content key of NEW spawns only.
 *
 * Docs: https://docs.rulvar.com/guide/tools.
 */
import { createHash } from 'node:crypto';

import { ConfigError } from '../l0/errors.js';
import { jcsSerialize } from '../l0/jcs.js';
import type { ToolContract } from '../l0/messages.js';
import { EMPTY_TOOLSET_HASH, toolContractHash, toolsetHash } from '../l0/schema.js';
import type { ToolDef, ToolExecutor, ToolSource, ToolSourceSession } from '../l0/spi/toolsource.js';
import { TOOL_NAME_PATTERN, toolContract } from './tool.js';

/** The per-spawn tools option value domain. */
export type ToolsOption = ReadonlyArray<ToolDef | ToolSource | string>;

/** The spawn's frozen toolset snapshot plus its identity hashes. */
export interface ResolvedToolset {
  tools: ToolDef[];
  contracts: ToolContract[];
  hash: string;
  /** The aggregate authority hash over the per-tool records (RV1802). */
  authorityHash: string;
}

/**
 * The authority projection of one tool (RV1802): what the tool may DO
 * and under what gate, beside WHAT the model sees. The contract hash
 * pins the model-facing tuple; risk, needsApproval, executor, and the
 * executorSpec digest are the declarations that never enter
 * toolsetHash by design, yet every one of them changes what the ask
 * rules and the approval flow will do. Execute bodies stay
 * deliberately unhashable: `version` remains the lever for behavior
 * drift under an unchanged contract.
 */
export interface ToolAuthority {
  /** toolContractHash of the model-facing contract tuple. */
  contract: string;
  /** The tool's approval gate (default false at build time). */
  needsApproval: boolean;
  /** Where execute runs: 'inprocess' or a registered executor tag. */
  executor: ToolExecutor;
  /** Present when the tool declares a risk class. */
  risk?: string;
  /** sha256 over the JCS-canonical executorSpec, when declared. */
  executorSpec?: string;
}

function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Derives one tool's authority record (RV1802). */
export function toolAuthority(def: ToolDef): ToolAuthority {
  const record: ToolAuthority = {
    contract: toolContractHash(toolContract(def)),
    needsApproval: def.needsApproval,
    executor: def.executor,
  };
  if (def.risk !== undefined) {
    record.risk = def.risk;
  }
  if (def.executorSpec !== undefined) {
    record.executorSpec = sha256Hex(jcsSerialize(def.executorSpec));
  }
  return record;
}

/**
 * The aggregate authority hash (RV1802): sha256 over the JCS-canonical
 * array of per-tool authority records, each carrying its tool name,
 * sorted by name; toolsetHash's exact aggregation shape, over the
 * authority side.
 */
export function toolsetAuthorityHash(authorities: Record<string, ToolAuthority>): string {
  const canonical = Object.entries(authorities)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([name, record]) => ({ name, ...record }));
  return sha256Hex(jcsSerialize(canonical));
}

/** The authorityHash of an empty toolset. */
export const EMPTY_AUTHORITY_HASH: string = toolsetAuthorityHash({});

function resolvedAuthoritiesOf(resolved: ResolvedToolset): Record<string, ToolAuthority> {
  const authorities: Record<string, ToolAuthority> = {};
  for (const def of resolved.tools) {
    authorities[def.name] = toolAuthority(def);
  }
  return authorities;
}

/** The empty toolset (no tools declared anywhere). */
export function emptyToolset(): ResolvedToolset {
  return {
    tools: [],
    contracts: [],
    hash: EMPTY_TOOLSET_HASH,
    authorityHash: EMPTY_AUTHORITY_HASH,
  };
}

/**
 * A recorded toolset pin (RV1514): the aggregate toolsetHash a spawn
 * must resolve to, plus optional per-tool contract hashes that turn a
 * mismatch refusal into a named diff (changed / missing / unexpected).
 * Record one with {@link attestToolset}; declare it as
 * `AgentProfile.toolsetAttestation`. Provider-side drift of an imported
 * tool's description or schema re-keys new spawns silently by design;
 * an attested profile turns exactly that drift into a typed refusal at
 * spawn time, before any provider call.
 */
export interface ToolsetAttestation {
  /** The expected aggregate toolsetHash (64 lowercase hex chars). */
  hash: string;
  /** Per-tool contract hashes by tool name; enables the named diff. */
  tools?: Record<string, string>;
  /**
   * The expected aggregate authority hash (RV1802). Absent on a legacy
   * contract-only pin, which keeps its documented posture: authority
   * drift (risk, needsApproval, executor, executorSpec) passes it
   * silently; re-record with {@link attestToolset} to upgrade.
   */
  authorityHash?: string;
  /** Per-tool authority records; enables the field-naming diff (RV1802). */
  authority?: Record<string, ToolAuthority>;
}

/** Records the attestation of a resolution: the pin a profile declares. */
export function attestToolset(resolved: ResolvedToolset): ToolsetAttestation {
  const tools: Record<string, string> = {};
  for (const contract of resolved.contracts) {
    tools[contract.name] = toolContractHash(contract);
  }
  return {
    hash: resolved.hash,
    tools,
    authorityHash: resolved.authorityHash,
    authority: resolvedAuthoritiesOf(resolved),
  };
}

const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/u;

/** Validates a declared attestation's shape (typed at createEngine). */
export function validateToolsetAttestation(attestation: ToolsetAttestation, path: string): void {
  if (typeof attestation.hash !== 'string' || !SHA256_HEX_PATTERN.test(attestation.hash)) {
    throw new ConfigError(`${path}.hash must be 64 lowercase hex chars (a sha-256 toolsetHash)`);
  }
  if (attestation.tools !== undefined) {
    for (const [name, hash] of Object.entries(attestation.tools)) {
      if (!TOOL_NAME_PATTERN.test(name)) {
        throw new ConfigError(
          `${path}.tools['${name}'] names a tool outside ^[a-zA-Z0-9_-]{1,64}$`,
        );
      }
      if (typeof hash !== 'string' || !SHA256_HEX_PATTERN.test(hash)) {
        throw new ConfigError(
          `${path}.tools['${name}'] must be 64 lowercase hex chars (a toolContractHash)`,
        );
      }
    }
  }
  if (attestation.authorityHash !== undefined) {
    if (
      typeof attestation.authorityHash !== 'string' ||
      !SHA256_HEX_PATTERN.test(attestation.authorityHash)
    ) {
      throw new ConfigError(
        `${path}.authorityHash must be 64 lowercase hex chars (a toolsetAuthorityHash)`,
      );
    }
  }
  if (attestation.authority === undefined) {
    return;
  }
  for (const [name, record] of Object.entries(attestation.authority)) {
    const at = `${path}.authority['${name}']`;
    if (!TOOL_NAME_PATTERN.test(name)) {
      throw new ConfigError(`${at} names a tool outside ^[a-zA-Z0-9_-]{1,64}$`);
    }
    if (typeof record.contract !== 'string' || !SHA256_HEX_PATTERN.test(record.contract)) {
      throw new ConfigError(`${at}.contract must be 64 lowercase hex chars (a toolContractHash)`);
    }
    if (typeof record.needsApproval !== 'boolean') {
      throw new ConfigError(`${at}.needsApproval must be a boolean`);
    }
    if (typeof record.executor !== 'string' || (record.executor as string) === '') {
      throw new ConfigError(`${at}.executor must be a non-empty executor tag`);
    }
    if (record.risk !== undefined && (typeof record.risk !== 'string' || record.risk === '')) {
      throw new ConfigError(`${at}.risk must be a non-empty string when present`);
    }
    if (
      record.executorSpec !== undefined &&
      (typeof record.executorSpec !== 'string' || !SHA256_HEX_PATTERN.test(record.executorSpec))
    ) {
      throw new ConfigError(
        `${at}.executorSpec must be 64 lowercase hex chars (a JCS sha-256 digest) when present`,
      );
    }
  }
}

/**
 * Holds a spawn's resolved toolset to its profile's attested pin
 * (RV1514): a hash mismatch is a typed ConfigError before any provider
 * call or budget admission. With per-tool hashes on the attestation the
 * refusal names the drift (changed / missing / unexpected); without
 * them it lists the resolved per-tool hashes, so the pin can be
 * corrected from the refusal itself. When the pin carries the authority
 * side (RV1802), a contract-clean resolution is additionally held to
 * the attested authorityHash, so risk, needsApproval, executor, and
 * executorSpec drift refuses at the same pre-wire site; a legacy
 * contract-only pin keeps its documented posture and passes it.
 */
export function enforceToolsetAttestation(
  agentType: string,
  attestation: ToolsetAttestation,
  resolved: ResolvedToolset,
): void {
  if (resolved.hash === attestation.hash) {
    enforceAuthorityAttestation(agentType, attestation, resolved);
    return;
  }
  const resolvedHashes = new Map(
    resolved.contracts.map((contract) => [contract.name, toolContractHash(contract)]),
  );
  const parts: string[] = [];
  if (attestation.tools === undefined) {
    const listing = [...resolvedHashes.entries()]
      .map(([name, hash]) => `${name} ${hash}`)
      .join(', ');
    parts.push(
      `resolved tools: ${listing === '' ? '(none)' : listing}`,
      'declare per-tool hashes on the attestation (attestToolset records them) for a named diff',
    );
  } else {
    const attested = attestation.tools;
    const changed: string[] = [];
    const missing: string[] = [];
    for (const [name, hash] of Object.entries(attested)) {
      const now = resolvedHashes.get(name);
      if (now === undefined) {
        missing.push(name);
      } else if (now !== hash) {
        changed.push(`${name} (attested ${hash}, resolved ${now})`);
      }
    }
    const unexpected = [...resolvedHashes.keys()].filter((name) => !Object.hasOwn(attested, name));
    if (changed.length > 0) {
      parts.push(`changed: ${changed.join('; ')}`);
    }
    if (missing.length > 0) {
      parts.push(`missing: ${missing.join(', ')}`);
    }
    if (unexpected.length > 0) {
      parts.push(`unexpected: ${unexpected.join(', ')}`);
    }
    if (parts.length === 0) {
      // Same names, same per-tool hashes, different aggregate: the
      // attestation's own fields disagree with each other.
      parts.push('the per-tool hashes match the resolution; the attested aggregate hash is stale');
    }
  }
  throw new ConfigError(
    `agent profile '${agentType}' attests toolsetHash ${attestation.hash}, but the spawn's ` +
      `toolset resolved to ${resolved.hash}; ${parts.join('; ')}. A provider-side contract ` +
      'change re-keys spawns by design; if the change is intended, re-record the pin with ' +
      'attestToolset() (https://docs.rulvar.com/guide/tools)',
  );
}

function describeAuthority(record: ToolAuthority): string {
  const bits = [
    `risk ${record.risk ?? '(absent)'}`,
    `needsApproval ${String(record.needsApproval)}`,
    `executor ${record.executor}`,
  ];
  if (record.executorSpec !== undefined) {
    bits.push(`executorSpec ${record.executorSpec}`);
  }
  return `{ ${bits.join(', ')} }`;
}

/**
 * The authority half of the pin (RV1802): runs only when the contract
 * hash already matched, so a refusal here is by construction an
 * authority-only drift, exactly the drift the contract hash cannot see.
 */
function enforceAuthorityAttestation(
  agentType: string,
  attestation: ToolsetAttestation,
  resolved: ResolvedToolset,
): void {
  if (attestation.authorityHash === undefined) {
    // A legacy contract-only pin (RV1514): the documented migration
    // posture. Authority drift passes it; re-record with attestToolset()
    // to upgrade the pin.
    return;
  }
  const authorities = resolvedAuthoritiesOf(resolved);
  const resolvedAggregate = toolsetAuthorityHash(authorities);
  if (resolvedAggregate === attestation.authorityHash) {
    return;
  }
  const parts: string[] = [];
  if (attestation.authority === undefined) {
    const listing = Object.entries(authorities)
      .map(([name, record]) => `${name} ${describeAuthority(record)}`)
      .join(', ');
    parts.push(
      `resolved authority: ${listing === '' ? '(none)' : listing}`,
      'declare per-tool authority records on the attestation (attestToolset records them) ' +
        'for a named diff',
    );
  } else {
    const attested = attestation.authority;
    const changed: string[] = [];
    const missing: string[] = [];
    for (const [name, record] of Object.entries(attested)) {
      const now = authorities[name];
      if (now === undefined) {
        missing.push(name);
        continue;
      }
      const fields: string[] = [];
      if (now.contract !== record.contract) {
        fields.push(`contract (attested ${record.contract}, resolved ${now.contract})`);
      }
      if ((now.risk ?? '(absent)') !== (record.risk ?? '(absent)')) {
        fields.push(
          `risk (attested ${record.risk ?? '(absent)'}, resolved ${now.risk ?? '(absent)'})`,
        );
      }
      if (now.needsApproval !== record.needsApproval) {
        fields.push(
          `needsApproval (attested ${String(record.needsApproval)}, ` +
            `resolved ${String(now.needsApproval)})`,
        );
      }
      if (now.executor !== record.executor) {
        fields.push(`executor (attested ${record.executor}, resolved ${now.executor})`);
      }
      if ((now.executorSpec ?? '(absent)') !== (record.executorSpec ?? '(absent)')) {
        fields.push('executorSpec');
      }
      if (fields.length > 0) {
        changed.push(`${name}: ${fields.join(', ')}`);
      }
    }
    const unexpected = Object.keys(authorities).filter((name) => !Object.hasOwn(attested, name));
    if (changed.length > 0) {
      parts.push(`changed: ${changed.join('; ')}`);
    }
    if (missing.length > 0) {
      parts.push(`missing: ${missing.join(', ')}`);
    }
    if (unexpected.length > 0) {
      parts.push(`unexpected: ${unexpected.join(', ')}`);
    }
    if (parts.length === 0) {
      // Same records, different aggregate: the attestation's own fields
      // disagree with each other.
      parts.push(
        'the per-tool authority records match the resolution; the attested authorityHash is stale',
      );
    }
  }
  throw new ConfigError(
    `agent profile '${agentType}' attests toolset authorityHash ${attestation.authorityHash}, ` +
      `but the spawn's toolset authority resolved to ${resolvedAggregate}; ${parts.join('; ')}. ` +
      'An authority change (risk, needsApproval, executor, executorSpec) never moves the ' +
      'contract hash by design; if the change is intended, re-record the pin with ' +
      'attestToolset() (https://docs.rulvar.com/guide/tools)',
  );
}

function isToolDef(spec: ToolDef | ToolSource | string): spec is ToolDef {
  return typeof spec !== 'string' && (spec as ToolDef).kind === 'tool';
}

/**
 * Expands registered names and sources, validates every tool name and
 * duplicate names across the whole toolset (ConfigError at spawn time),
 * and computes the toolsetHash over contracts sorted by name. The
 * `toolsets` registry is the engine's `defaults.toolsets` snapshot;
 * without one, string entries fail with the same unknown-name error as
 * a miss, so nothing outside the declared registry is ever reachable.
 */
export async function resolveToolset(
  specs: ToolsOption | undefined,
  session: ToolSourceSession,
  toolsets?: Record<string, ToolsOption>,
  /**
   * The engine's registered non-inprocess executor tags (RV-216). A tool
   * declaring an executor absent from this set fails typed at spawn time,
   * before any provider or model call; the default empty set preserves
   * the pre-RV-216 behavior where only 'inprocess' is accepted.
   */
  executors?: ReadonlySet<string>,
): Promise<ResolvedToolset> {
  if (specs === undefined || specs.length === 0) {
    return emptyToolset();
  }
  const tools: ToolDef[] = [];
  // ToolDef entries push synchronously and only ToolSource expansion
  // awaits: the await profile of a defs-only toolset is part of fresh-run
  // byte determinism (cassette-pinned append interleavings).
  for (const spec of specs) {
    if (typeof spec === 'string') {
      const named = toolsets?.[spec];
      if (named === undefined) {
        throw new ConfigError(
          `unknown registered toolset '${spec}': register it under ` +
            'defaults.toolsets (https://docs.rulvar.com/guide/tools)',
        );
      }
      for (const entry of named) {
        if (typeof entry === 'string') {
          // No nesting: a registry value holds concrete ToolDef and
          // ToolSource entries, never other registered names, so a
          // registry can never cycle.
          throw new ConfigError(
            `registered toolset '${spec}' contains the name '${entry}': registry values ` +
              'hold ToolDef or ToolSource entries, never other registered names',
          );
        }
        if (isToolDef(entry)) {
          tools.push(entry);
          continue;
        }
        tools.push(...(await entry.tools(session)));
      }
      continue;
    }
    if (isToolDef(spec)) {
      tools.push(spec);
      continue;
    }
    tools.push(...(await spec.tools(session)));
  }
  const seen = new Map<string, ToolDef>();
  for (const def of tools) {
    if (!TOOL_NAME_PATTERN.test(def.name)) {
      throw new ConfigError(
        `imported tool name '${def.name}' must match ^[a-zA-Z0-9_-]{1,64}$; ` +
          'namespace it with the source prefix option',
      );
    }
    if (seen.has(def.name)) {
      throw new ConfigError(
        `duplicate tool name '${def.name}' in one toolset; disambiguate with the ` +
          'MCP prefix option',
      );
    }
    if (def.executor !== 'inprocess' && !(executors?.has(def.executor) ?? false)) {
      // Fail at spawn, not at first call (RV-216): a non-inprocess tool is
      // dispatched through a registered ToolExecutorProvider, so an
      // unregistered tag can never reach a provider or the model. With no
      // executors registered this is byte-identical to the pre-RV-216
      // "only 'inprocess'" rejection.
      throw new ConfigError(
        `tool '${def.name}' declares executor '${def.executor}', but no such executor is ` +
          'registered; register one via createEngine({ executors }) ' +
          '(https://docs.rulvar.com/guide/isolated-executor)',
      );
    }
    seen.set(def.name, def);
  }
  const contracts = tools.map((def) => toolContract(def));
  const authorities: Record<string, ToolAuthority> = {};
  for (const def of tools) {
    authorities[def.name] = toolAuthority(def);
  }
  return {
    tools,
    contracts,
    hash: toolsetHash(contracts),
    authorityHash: toolsetAuthorityHash(authorities),
  };
}
