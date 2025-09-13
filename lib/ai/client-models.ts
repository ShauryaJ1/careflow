// Client-safe model configuration (no server-side dependencies)
export const CLIENT_MODEL_CONFIG = {
  'chat-model': {
    modelId: 'grok-3',
    contextWindow: 131072, // From your screenshot
  },
  'chat-model-reasoning': {
    modelId: 'grok-3',
    contextWindow: 131072,
  },
  'title-model': {
    modelId: 'grok-3-mini',
    contextWindow: 131072,
  },
  'artifact-model': {
    modelId: 'grok-code-fast-1',
    contextWindow: 256000, // Code model has larger context
  },
} as const;

// Client-safe function to get model info
export function getClientModelInfo(modelId: string) {
  return CLIENT_MODEL_CONFIG[modelId as keyof typeof CLIENT_MODEL_CONFIG] || {
    modelId: 'grok-beta',
    contextWindow: 128000,
  };
}