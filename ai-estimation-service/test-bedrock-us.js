const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

// Try US region and standard model with Converse API
const client = new BedrockRuntimeClient({
  region: 'us-east-1',
});

const input = {
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  messages: [
    {
      role: 'user',
      content: [{ text: 'Say hello in one word' }],
    },
  ],
  inferenceConfig: {
    maxTokens: 100,
    temperature: 1.0,
  },
};

console.log('Testing AWS Bedrock Converse API with US region and standard model...');
const command = new ConverseCommand(input);

client.send(command)
  .then(response => {
    console.log('SUCCESS:', response.output.message.content[0].text);
    console.log('Model works! You can use:', input.modelId, 'in region us-east-1');
    console.log('Usage:', response.usage);
    process.exit(0);
  })
  .catch(error => {
    console.error('ERROR:', error.message);
    console.error('This may be a credential or permission issue');
    process.exit(1);
  });
