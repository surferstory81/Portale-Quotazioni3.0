const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

// Try US region and standard model
const client = new BedrockRuntimeClient({
  region: 'us-east-1',
});

const body = {
  anthropic_version: 'bedrock-2023-05-31',
  max_tokens: 100,
  temperature: 1.0,
  messages: [{ role: 'user', content: 'Say hello in one word' }],
};

const input = {
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  contentType: 'application/json',
  accept: 'application/json',
  body: JSON.stringify(body),
};

console.log('Testing AWS Bedrock with US region and standard model...');
const command = new InvokeModelCommand(input);

client.send(command)
  .then(response => {
    const result = JSON.parse(new TextDecoder().decode(response.body));
    console.log('SUCCESS:', result.content[0].text);
    console.log('Model works! You can use:', input.modelId, 'in region us-east-1');
    process.exit(0);
  })
  .catch(error => {
    console.error('ERROR:', error.message);
    console.error('This may be a credential or permission issue');
    process.exit(1);
  });
