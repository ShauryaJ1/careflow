import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { isTestEnvironment } from '../constants';

// Only import and create provider on server side
let serverProvider: any = null;

function getServerProvider() {
  if (typeof window !== 'undefined') {
    throw new Error('AI provider can only be used on the server side');
  }
  
  if (!serverProvider) {
    if (isTestEnvironment) {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require('./models.mock');
      serverProvider = customProvider({
        languageModels: {
          'chat-model': chatModel,
          'chat-model-reasoning': reasoningModel,
          'title-model': titleModel,
          'artifact-model': artifactModel,
        },
      });
    } else {
      const { createXaiProvider } = require('./providers-direct-v2');
      serverProvider = createXaiProvider();
    }
  }
  
  return serverProvider;
}

// Export a getter function instead of the provider directly
export const myProvider = new Proxy({} as any, {
  get(target, prop) {
    return getServerProvider()[prop];
  }
});
