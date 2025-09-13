// Test xAI API key manually
export async function testXaiApiKey() {
  console.log('All environment variables starting with AI_:', 
    Object.keys(process.env).filter(key => key.startsWith('AI_'))
  );
  console.log('All environment variables starting with NEXT_:', 
    Object.keys(process.env).filter(key => key.startsWith('NEXT_'))
  );
  
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  
  console.log('Raw AI_GATEWAY_API_KEY:', apiKey);
  console.log('process.env keys:', Object.keys(process.env).slice(0, 10));
  
  if (!apiKey) {
    console.error('No API key found');
    return;
  }

  console.log('Testing xAI API with key:', apiKey.substring(0, 10) + '...');

  try {
    const response = await fetch('https://api.x.ai/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('API test response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Available models:', data.data?.map((m: any) => m.id));
    } else {
      const errorText = await response.text();
      console.error('API test failed:', errorText);
    }
  } catch (error) {
    console.error('API test error:', error);
  }
}

// Call this when the module loads
testXaiApiKey();