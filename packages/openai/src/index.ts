/**
 * @rulvar/openai: the first-class OpenAI Responses API adapter with the
 * Chat Completions degraded path, plus the openaiCompatible factory for
 * Ollama, vLLM, and gateways.
 */
export { openai, OPENAI_MODELS } from './adapter.js';
export { openaiCompatible, CONSERVATIVE_COMPATIBLE_CAPS } from './compatible.js';
export type { OpenAiCompatibleConfig } from './compatible.js';
export type { OpenAiAdapterOptions, OpenAiClientLike, OpenAiSdkOptions } from './adapter.js';
export { openAiModelInfo, OPENAI_PRICING } from './caps.js';
export type { OpenAiModelInfo } from './caps.js';
export { auditV1190CacheJournal, undoV1190CacheDoubleCount } from './audit.js';
export type { V1190CacheAudit } from './audit.js';
// Statement reconciliation moved to @rulvar/core (RV1703): the module
// was provider-neutral from birth (it types against the invoice and
// the pricing SPI only), and its home here forced Anthropic-only
// consumers into an OpenAI dependency. The re-exports keep every
// existing import path working unchanged.
export { reconcileStatement, statementFromRows } from '@rulvar/core';
export type {
  BillingComponent,
  ComponentDelta,
  ProviderStatement,
  ReconcileStatementOptions,
  StatementCategoryRow,
  StatementColumnMap,
  StatementCoverage,
  StatementReconciliation,
  StatementRequestRow,
} from '@rulvar/core';
export {
  buildChatCompletionsParams,
  buildResponsesParams,
  mapChatCompletionsStream,
  mapOpenAiEffort,
  mapResponsesStream,
  normalizeOpenAiUsage,
  OpenAiIdMap,
  openAiErrorToWire,
} from './wire.js';
export type { ResponsesStreamEvent } from './wire.js';
