// Server action to test xAI API key
'use server'

export async function serverTestXaiApiKey() {
  console.log('All environment variables starting with AI_:', 
    Object.keys(process.env).filter(key => key.startsWith('AI_'))
  );
  console.log('All environment variables starting with NEXT_:', 
    Object.keys(process.env).filter(key => key.startsWith('NEXT_'))
  );
  
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  
  console.log('Raw AI_GATEWAY_API_KEY:', apiKey);
  console.log('API key length:', apiKey?.length);
  console.log('API key first 10 chars:', apiKey?.slice(0, 10));
  
  if (!apiKey) {
    console.error('No API key found');
    return { error: 'No API key found' };
  }

  return { 
    success: true, 
    hasKey: !!apiKey,
    keyLength: apiKey.length,
    keyPrefix: apiKey.slice(0, 10)
  };
}