import { createOpenAI } from '@ai-sdk/openai';
import { customProvider } from 'ai';

// Ensure environment variables are loaded
if (typeof window === 'undefined') {
  try {
    require('dotenv').config({ path: '.env.local' });
  } catch (error) {
    console.warn('Could not load dotenv:', error.message);
  }
}

// Utility function to get environment variable with fallback loading
function getApiKey(): string {
  // Try multiple ways to get the environment variable
  let apiKey = process.env.AI_GATEWAY_API_KEY;
  
  // If not found, try loading from .env.local manually
  if (!apiKey && typeof window === 'undefined') {
    try {
      const fs = require('fs');
      const path = require('path');
      const envPath = path.resolve(process.cwd(), '.env.local');
      
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/^AI_GATEWAY_API_KEY=(.+)$/m);
        if (match) {
          apiKey = match[1].trim();
          console.log('Loaded API key from .env.local manually');
        }
      }
    } catch (error) {
      console.warn('Could not manually load .env.local:', error.message);
    }
  }
  
  return apiKey || '';
}

// Create xAI provider function that runs only on server side
export function createXaiProvider() {
  // This should only be called on the server side
  const apiKey = getApiKey();
  
  console.log('Environment variables check:');
  console.log('- process.env.AI_GATEWAY_API_KEY:', process.env.AI_GATEWAY_API_KEY ? 'present' : 'missing');
  console.log('- getApiKey() result:', apiKey ? 'present' : 'missing');
  console.log('- API key length:', apiKey?.length || 0);
  
  if (!apiKey) {
    throw new Error('AI_GATEWAY_API_KEY environment variable is not set');
  }

  console.log('Creating xAI provider with API key length:', apiKey.length);
  console.log('Creating xAI provider with API key prefix:', apiKey.slice(0, 10));

  const xai = createOpenAI({
    name: 'xai',
    apiKey: apiKey,
    baseURL: 'https://api.x.ai/v1',
  });

  // Return the custom provider with correct xAI model names
  return customProvider({
    languageModels: {
      'chat-model': xai('grok-3'),
      'chat-model-reasoning': xai('grok-3'), 
      'title-model': xai('grok-3-mini'), // Use mini for simple title generation
      'artifact-model': xai('grok-code-fast-1'), // Use code model for artifacts
    },
  });
}

// Available models
export const XAI_MODELS = {
  GROK_BETA: 'grok-beta',
  GROK_2: 'grok-2',
} as const;

export type XaiModel = typeof XAI_MODELS[keyof typeof XAI_MODELS];