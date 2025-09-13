import { NextRequest, NextResponse } from 'next/server';
import { createXaiProvider } from '@/lib/ai/providers-direct-v2';

export async function GET() {
  try {
    console.log('=== Testing xAI API Call ===');
    
    // Create the provider
    const provider = createXaiProvider();
    console.log('✓ Provider created successfully');
    
    // Try to get a language model
    const model = provider.languageModel('chat-model');
    console.log('✓ Model retrieved successfully');
    
    // Test a simple API call
    const result = await model.doGenerate({
      inputFormat: 'prompt',
      mode: { type: 'regular' },
      prompt: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Hello! Please respond with just "API working"' }]
        }
      ]
    });
    
    console.log('✓ API call successful');
    console.log('Response:', result.text);
    
    return NextResponse.json({
      success: true,
      message: 'xAI API call successful',
      response: result.text,
      finishReason: result.finishReason,
      usage: result.usage
    });
    
  } catch (error) {
    console.error('✗ xAI API test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}