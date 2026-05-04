export default () => ({
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  aws: {
    region: process.env.AWS_REGION || 'eu-west-1',
    bedrockModelId: process.env.AWS_BEDROCK_MODEL_ID || 'eu.anthropic.claude-sonnet-4-5-20250929-v1:0',
    timeoutMs: parseInt(process.env.BEDROCK_TIMEOUT_MS, 10) || 30000,
    maxTokens: parseInt(process.env.BEDROCK_MAX_TOKENS, 10) || 16000,
  },

  backend: {
    apiUrl: process.env.BACKEND_API_URL || 'http://backend:3000',
    serviceToken: process.env.BACKEND_SERVICE_TOKEN,
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    queue: process.env.RABBITMQ_QUEUE || 'ai-estimation-queue',
    exchange: process.env.RABBITMQ_EXCHANGE || 'portale-quotazioni',
    prefetch: parseInt(process.env.RABBITMQ_PREFETCH, 10) || 1,
  },

  knowledgeBase: {
    path: process.env.KNOWLEDGE_BASE_PATH || './knowledge',
  },

  retry: {
    maxRetries: parseInt(process.env.MAX_RETRIES, 10) || 3,
    delayMs: parseInt(process.env.RETRY_DELAY_MS, 10) || 1000,
  },

  circuitBreaker: {
    threshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD, 10) || 5,
    timeoutMs: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT_MS, 10) || 60000,
  },

  tools: {
    awsPricing: process.env.ENABLE_AWS_PRICING_TOOL === 'true',
    azurePricing: process.env.ENABLE_AZURE_PRICING_TOOL === 'true',
  },
});
