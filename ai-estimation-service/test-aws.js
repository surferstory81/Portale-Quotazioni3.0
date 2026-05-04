const { BedrockRuntimeClient, ListFoundationModelsCommand } = require('@aws-sdk/client-bedrock-runtime');
const { BedrockClient } = require('@aws-sdk/client-bedrock');

async function test() {
  try {
    // Test basic AWS connectivity
    console.log('1. Testing AWS credentials...');
    const bedrockClient = new BedrockClient({ region: 'eu-west-1' });
    const listCommand = new ListFoundationModelsCommand({});
    
    const models = await bedrockClient.send(listCommand);
    console.log('SUCCESS: AWS credentials valid');
    console.log('Available models:', models.modelSummaries?.length || 0);
    
    // Check if our model is available
    const ourModel = models.modelSummaries?.find(m => 
      m.modelId === 'eu.anthropic.claude-sonnet-4-5-20250929-v1:0'
    );
    
    if (ourModel) {
      console.log('SUCCESS: Target model is available');
    } else {
      console.log('WARNING: Target model not found in available models');
      console.log('First 5 available models:');
      models.modelSummaries?.slice(0, 5).forEach(m => {
        console.log(' -', m.modelId);
      });
    }
    
  } catch (error) {
    console.error('ERROR:', error.message);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
  }
}

test();
