/**
 * @lurker/bridge-ai-sdk: wraps any Vercel AI SDK LanguageModelV4 as a
 * lurker ProviderAdapter (docs/04-model-layer-spec.md, section
 * "@lurker/bridge-ai-sdk"). Documented as the highest-churn package of the
 * set: it tracks the @ai-sdk/provider major line and its provider-major
 * bumps are the most likely driver of post-1.0 BREAKING majors.
 */
export { bridgeAiSdk, aiSdkErrorToWire, type BridgeAiSdkOptions } from './bridge.js';
