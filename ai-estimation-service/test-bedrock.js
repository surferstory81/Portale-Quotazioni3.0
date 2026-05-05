const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

const client = new BedrockRuntimeClient({
  region: 'eu-central-1',
  requestHandler: {
    requestTimeout: 120000,
  },
});

const input = {
  modelId: 'eu.anthropic.claude-sonnet-4-5-20250929-v1:0',
  messages: [
    {
      role: 'user',
      content: [{ text: 'Say hello in one word' }],
    },
  ],
  inferenceConfig: {
    maxTokens: 100,
    temperature: 1.0,
    topP: 0.999,
  },
};

console.log('Testing AWS Bedrock Converse API...');
console.log('Region: eu-central-1');
console.log('Model:', input.modelId);

const command = new ConverseCommand(input);

client.send(command)
  .then(response => {
    console.log('\n✅ SUCCESS!');
    console.log('Stop reason:', response.stopReason);
    console.log('Usage:', response.usage);
    console.log('Response:', response.output.message.content[0].text);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ ERROR:', error.message);
    console.error('Error code:', error.name);
    if (error.$metadata) {
      console.error('HTTP Status:', error.$metadata.httpStatusCode);
    }
    process.exit(1);
  });
