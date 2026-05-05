const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

const client = new BedrockRuntimeClient({
  region: 'eu-central-1',
  requestHandler: {
    requestTimeout: 120000,
  },
});

const testToolUse = async () => {
  console.log('🧪 Testing AWS Bedrock Tool Use (Function Calling)\n');
  console.log('Region: eu-central-1');
  console.log('Model: eu.anthropic.claude-sonnet-4-5-20250929-v1:0\n');

  // Define available tools
  const tools = [
    {
      toolSpec: {
        name: 'get_ec2_pricing',
        description: 'Get current AWS EC2 instance pricing',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              instanceType: {
                type: 'string',
                description: 'EC2 instance type (e.g., t3.medium)',
              },
              region: {
                type: 'string',
                description: 'AWS region (e.g., eu-central-1)',
              },
            },
            required: ['instanceType', 'region'],
          },
        },
      },
    },
  ];

  const messages = [
    {
      role: 'user',
      content: [
        {
          text: 'What is the monthly cost for running 5 t3.medium instances in eu-central-1? Use the pricing tool to get accurate data.',
        },
      ],
    },
  ];

  try {
    // Turn 1: AI decides to use tool
    console.log('📝 Turn 1: Requesting AI to use pricing tool...');
    const input1 = {
      modelId: 'eu.anthropic.claude-sonnet-4-5-20250929-v1:0',
      messages,
      toolConfig: { tools },
      inferenceConfig: {
        maxTokens: 1000,
        temperature: 1.0,
      },
    };

    const command1 = new ConverseCommand(input1);
    const response1 = await client.send(command1);

    console.log('✅ Turn 1 completed');
    console.log('   Stop reason:', response1.stopReason);
    console.log('   Output tokens:', response1.usage.outputTokens);

    // Check if AI requested tool use
    const toolUseBlock = response1.output.message.content.find(block => block.toolUse);

    if (!toolUseBlock) {
      console.log('⚠️  AI did not request tool use');
      console.log('   Response:', response1.output.message.content[0].text);
      process.exit(0);
    }

    const toolUse = toolUseBlock.toolUse;
    console.log('   🔧 Tool requested:', toolUse.name);
    console.log('   Input:', JSON.stringify(toolUse.input, null, 2));

    // Simulate tool execution
    const toolResult = {
      onDemandMonthlyUSD: 30.37, // Mock: 0.0416 USD/hour * 730 hours
      currency: 'USD',
      region: toolUse.input.region,
      instanceType: toolUse.input.instanceType,
    };

    console.log('\n   ⚙️  Tool executed, result:', JSON.stringify(toolResult, null, 2));

    // Turn 2: Send tool result back to AI
    console.log('\n📝 Turn 2: Sending tool result to AI...');

    // Add assistant message with tool use
    messages.push({
      role: 'assistant',
      content: response1.output.message.content,
    });

    // Add tool result as user message
    messages.push({
      role: 'user',
      content: [
        {
          toolResult: {
            toolUseId: toolUse.toolUseId,
            content: [{ json: toolResult }],
          },
        },
      ],
    });

    const input2 = {
      modelId: 'eu.anthropic.claude-sonnet-4-5-20250929-v1:0',
      messages,
      toolConfig: { tools },
      inferenceConfig: {
        maxTokens: 1000,
        temperature: 1.0,
      },
    };

    const command2 = new ConverseCommand(input2);
    const response2 = await client.send(command2);

    console.log('✅ Turn 2 completed');
    console.log('   Stop reason:', response2.stopReason);
    console.log('   Output tokens:', response2.usage.outputTokens);

    const finalText = response2.output.message.content.find(block => block.text);
    if (finalText) {
      console.log('\n📊 Final Answer:');
      console.log(finalText.text);
    }

    console.log('\n✨ Tool use test successful!');
    console.log('   Total turns: 2');
    console.log(`   Total tokens: ${response1.usage.inputTokens + response2.usage.inputTokens} input, ${response1.usage.outputTokens + response2.usage.outputTokens} output`);

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

testToolUse();
