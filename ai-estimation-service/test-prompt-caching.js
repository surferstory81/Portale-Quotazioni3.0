const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

const client = new BedrockRuntimeClient({
  region: 'eu-central-1',
  requestHandler: {
    requestTimeout: 120000,
  },
});

const systemPrompt = `You are a cost estimation AI assistant.

## Knowledge Base

### Infrastructure Costs
- AWS EC2 t3.medium: €50/month
- AWS EC2 m5.large: €120/month
- Storage (EBS gp3): €0.08/GB/month
- Bandwidth: €0.09/GB

### Software Licenses
- Windows Server: €500/year
- SQL Server Standard: €1,500/year
- Oracle Database: €5,000/year

### Professional Services
- Developer: €500/day
- Architect: €800/day
- DevOps: €600/day

This knowledge base is cacheable to reduce costs by 90% on subsequent requests.`;

const testCaching = async () => {
  console.log('🧪 Testing AWS Bedrock Prompt Caching\n');
  console.log('Region: eu-central-1');
  console.log('Model: eu.anthropic.claude-sonnet-4-5-20250929-v1:0\n');

  // First request - should CREATE cache
  console.log('📝 Request 1: Creating cache...');
  const input1 = {
    modelId: 'eu.anthropic.claude-sonnet-4-5-20250929-v1:0',
    system: [
      {
        text: systemPrompt,
        cacheControl: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [{ text: 'Estimate cost for 2 EC2 t3.medium instances for 1 year' }],
      },
    ],
    inferenceConfig: {
      maxTokens: 200,
      temperature: 1.0,
    },
  };

  try {
    const command1 = new ConverseCommand(input1);
    const response1 = await client.send(command1);

    console.log('✅ Request 1 completed');
    console.log('   Input tokens:', response1.usage.inputTokens);
    console.log('   Output tokens:', response1.usage.outputTokens);
    console.log('   Cache created:', response1.usage.cacheCreationInputTokens || 0, 'tokens');
    console.log('   Cache read:', response1.usage.cacheReadInputTokens || 0, 'tokens');
    console.log('   Response:', response1.output.message.content[0].text.substring(0, 100) + '...\n');

    // Wait 2 seconds
    console.log('⏱️  Waiting 2 seconds before second request...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Second request - should READ from cache
    console.log('📝 Request 2: Using cached system prompt...');
    const input2 = {
      modelId: 'eu.anthropic.claude-sonnet-4-5-20250929-v1:0',
      system: [
        {
          text: systemPrompt,
          cacheControl: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: [{ text: 'Estimate cost for 5 SQL Server Standard licenses' }],
        },
      ],
      inferenceConfig: {
        maxTokens: 200,
        temperature: 1.0,
      },
    };

    const command2 = new ConverseCommand(input2);
    const response2 = await client.send(command2);

    console.log('✅ Request 2 completed');
    console.log('   Input tokens:', response2.usage.inputTokens);
    console.log('   Output tokens:', response2.usage.outputTokens);
    console.log('   Cache created:', response2.usage.cacheCreationInputTokens || 0, 'tokens');
    console.log('   Cache read:', response2.usage.cacheReadInputTokens || 0, 'tokens');
    console.log('   Response:', response2.output.message.content[0].text.substring(0, 100) + '...\n');

    // Calculate savings
    const cacheCreated = response1.usage.cacheCreationInputTokens || 0;
    const cacheRead = response2.usage.cacheReadInputTokens || 0;

    if (cacheRead > 0) {
      const savingsPercent = Math.round((cacheRead / (cacheRead + response2.usage.inputTokens)) * 90);
      console.log('💰 Cost savings on Request 2:');
      console.log(`   Cached tokens: ${cacheRead} (read at 10% cost)`);
      console.log(`   Estimated savings: ~${savingsPercent}% on cached portion`);
      console.log(`   ✨ Prompt caching is working correctly!`);
    } else {
      console.log('⚠️  Cache not used in Request 2');
      console.log('   This might be normal if cache expired or system prompt differs');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Error code:', error.name);
    if (error.$metadata) {
      console.error('HTTP Status:', error.$metadata.httpStatusCode);
    }
    process.exit(1);
  }
};

testCaching();
