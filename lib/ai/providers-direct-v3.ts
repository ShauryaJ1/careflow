import { createOpenAI } from '@ai-sdk/openai';
import { customProvider } from 'ai';

// Test different model names that xAI might support
const modelNames = [
  'grok-beta',
  'grok-1',
  'grok',
  'grok-2',
  'grok-vision-beta'
];

console.log('Testing xAI provider with models:', modelNames);

// Create xAI provider with multiple fallback options
const xai = createOpenAI({
  name: 'xai',
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

// Fallback xAI provider with simpler model names
export const directProvider = customProvider({
  languageModels: {
    'chat-model': xai('grok-beta'),
    'chat-model-reasoning': xai('grok-beta'),
    'title-model': xai('grok-beta'),
    'artifact-model': xai('grok-beta'),
  },
});