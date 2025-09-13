import { openai } from '@ai-sdk/openai';
import { customProvider } from 'ai';

// Debug: Check if API key is loaded
console.log('AI_GATEWAY_API_KEY exists:', !!process.env.AI_GATEWAY_API_KEY);
console.log('AI_GATEWAY_API_KEY preview:', process.env.AI_GATEWAY_API_KEY?.substring(0, 10) + '...');

// Direct xAI provider (bypassing Vercel AI Gateway)
export const directProvider = customProvider({
  languageModels: {
    'chat-model': openai('grok-2-vision-1212', {
      baseURL: 'https://api.x.ai/v1',
      apiKey: process.env.AI_GATEWAY_API_KEY,
    }),
    'chat-model-reasoning': openai('grok-3-mini', {
      baseURL: 'https://api.x.ai/v1',
      apiKey: process.env.AI_GATEWAY_API_KEY,
    }),
    'title-model': openai('grok-2-1212', {
      baseURL: 'https://api.x.ai/v1',
      apiKey: process.env.AI_GATEWAY_API_KEY,
    }),
    'artifact-model': openai('grok-2-1212', {
      baseURL: 'https://api.x.ai/v1',
      apiKey: process.env.AI_GATEWAY_API_KEY,
    }),
  },
});