const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const client = new BedrockRuntimeClient({
  region: 'eu-west-1',
  requestHandler: {
    requestTimeout: 120000,
  },
});

const body = {
  anthropic_version: 'bedrock-2023-05-31',
  max_tokens: 100,
  temperature: 1.0,
  messages: [{ role: 'user', content: 'Say hello in one word' }],
};

const input = {
  modelId: 'eu.anthropic.claude-sonnet-4-5-20250929-v1:0',
  contentType: 'application/json',
  accept: 'application/json',
  body: JSON.stringify(body),
};

console.log('Testing AWS Bedrock connection...');
const command = new InvokeModelCommand(input);

client.send(command)
  .then(response => {
    const result = JSON.parse(new TextDecoder().decode(response.body));
    console.log('SUCCESS:', result.content[0].text);
    process.exit(0);
  })
  .catch(error => {
    console.error('ERROR:', error.message);
    console.error('Error code:', error.name);
    process.exit(1);
  });
