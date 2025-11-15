/**
 * Test script for OpenAI-compatible API endpoints
 * Tests chat completions, embeddings, and LangChain compatibility
 */

import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'http://localhost:4141';

/**
 * Test /v1/models endpoint
 */
async function testModelsEndpoint() {
  console.log('\n🔍 Testing /v1/models endpoint...');
  
  const response = await fetch(`${API_BASE}/v1/models`);
  const data = await response.json() as any;
  
  console.log('✅ Models endpoint works');
  console.log(`   Mimir models: ${data.data.filter((m: any) => m.owned_by === 'mimir').map((m: any) => m.id).join(', ')}`);
  return data;
}

/**
 * Test /v1/embeddings endpoint
 */
async function testEmbeddingsEndpoint() {
  console.log('\n🔍 Testing /v1/embeddings endpoint...');
  
  const testInput = 'How do I integrate Angular components?';
  
  const response = await fetch(`${API_BASE}/v1/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: testInput,
      model: 'mxbai-embed-large',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json() as any;
  console.log('✅ Embeddings endpoint works');
  console.log(`   Model: ${data.model}`);
  console.log(`   Dimension: ${data.data[0].embedding.length}`);
  return data;
}

/**
 * Test batch embeddings
 */
async function testBatchEmbeddings() {
  console.log('\n🔍 Testing batch embeddings...');
  
  const testInputs = [
    'How do I integrate Angular components?',
    'What is dependency injection?',
    'How to use TypeScript with React?',
  ];
  
  const response = await fetch(`${API_BASE}/v1/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: testInputs,
      model: 'mxbai-embed-large',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json() as any;
  console.log('✅ Batch embeddings work');
  console.log(`   Inputs: ${testInputs.length}, Outputs: ${data.data.length}`);
  return data;
}

/**
 * Test chat completions (streaming)
 */
async function testChatCompletionsStreaming() {
  console.log('\n🔍 Testing /v1/chat/completions (streaming)...');
  
  const response = await fetch(`${API_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: 'Say "Test successful" and nothing else.' }
      ],
      model: 'gpt-4.1',
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  console.log('✅ Chat streaming works');
  console.log('   Response: ', { newline: false });

  let fullResponse = '';
  const reader = response.body!;
  let buffer = '';

  for await (const chunk of reader as any) {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith(':')) continue;
      
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') break;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            process.stdout.write(content);
            fullResponse += content;
          }
        } catch (e) {
          // Skip
        }
      }
    }
  }

  console.log('\n');
  return fullResponse;
}

/**
 * Test LangChain compatibility
 */
async function testLangChainCompatibility() {
  console.log('\n🔍 Testing LangChain compatibility...');
  
  const response = await fetch(`${API_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer dummy',
    },
    body: JSON.stringify({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Say "Compatible" only.' },
      ],
      stream: true,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  let fullResponse = '';
  const reader = response.body!;
  let buffer = '';

  for await (const chunk of reader as any) {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') break;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) fullResponse += content;
        } catch (e) {
          // Skip
        }
      }
    }
  }

  console.log('✅ LangChain compatible');
  console.log(`   Response: "${fullResponse.trim()}"`);
  return true;
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 OpenAI-Compatible API Test Suite');
  console.log(`   Base URL: ${API_BASE}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const results: { test: string; passed: boolean; error?: string }[] = [];

  // Test 1: Models
  try {
    await testModelsEndpoint();
    results.push({ test: 'Models endpoint', passed: true });
  } catch (error: any) {
    results.push({ test: 'Models endpoint', passed: false, error: error.message });
  }

  // Test 2: Single embeddings
  try {
    await testEmbeddingsEndpoint();
    results.push({ test: 'Single embeddings', passed: true });
  } catch (error: any) {
    results.push({ test: 'Single embeddings', passed: false, error: error.message });
  }

  // Test 3: Batch embeddings
  try {
    await testBatchEmbeddings();
    results.push({ test: 'Batch embeddings', passed: true });
  } catch (error: any) {
    results.push({ test: 'Batch embeddings', passed: false, error: error.message });
  }

  // Test 4: Chat streaming
  try {
    await testChatCompletionsStreaming();
    results.push({ test: 'Chat streaming', passed: true });
  } catch (error: any) {
    results.push({ test: 'Chat streaming', passed: false, error: error.message });
  }

  // Test 5: LangChain
  try {
    await testLangChainCompatibility();
    results.push({ test: 'LangChain compatibility', passed: true });
  } catch (error: any) {
    results.push({ test: 'LangChain compatibility', passed: false, error: error.message });
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Test Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.test}`);
    if (!result.passed && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Results: ${passed}/${total} tests passed`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(passed === total ? 0 : 1);
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 