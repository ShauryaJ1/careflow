import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('=== API Route Environment Test ===');
    console.log('All env vars starting with AI_:', 
      Object.keys(process.env).filter(key => key.startsWith('AI_'))
    );
    
    const apiKey = process.env.AI_GATEWAY_API_KEY;
    
    console.log('Raw AI_GATEWAY_API_KEY:', apiKey ? 'present' : 'missing');
    console.log('API key length:', apiKey?.length || 0);
    console.log('API key first 10 chars:', apiKey?.slice(0, 10) || '');
    
    return NextResponse.json({
      success: true,
      hasKey: !!apiKey,
      keyLength: apiKey?.length || 0,
      keyPrefix: apiKey?.slice(0, 10) || '',
      envKeys: Object.keys(process.env).filter(key => key.startsWith('AI_')),
      message: apiKey ? 'API key found!' : 'No API key found'
    });
  } catch (error) {
    console.error('Error in test-env route:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}