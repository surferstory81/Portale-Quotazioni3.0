/**
 * Available AI Models Configuration
 *
 * Defines the models available for quotation estimation with their
 * characteristics, pricing, and use cases.
 */

export interface ModelConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  inputCostPer1M: number;  // USD per 1M input tokens
  outputCostPer1M: number; // USD per 1M output tokens
  recommendedFor: string[];
  maxTokens: number;
}

export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
  'claude-sonnet-4.5': {
    id: 'eu.anthropic.claude-sonnet-4-5-20250929-v1:0',
    name: 'claude-sonnet-4.5',
    displayName: 'Claude Sonnet 4.5',
    description: 'Bilanciamento ottimale tra qualità e costo - Modello di default',
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
    recommendedFor: ['Quotazioni standard', 'Uso quotidiano', 'Miglior rapporto qualità/prezzo'],
    maxTokens: 8192,
  },
  'claude-opus-4': {
    id: 'eu.anthropic.claude-opus-4-20250514-v1:0',
    name: 'claude-opus-4',
    displayName: 'Claude Opus 4',
    description: 'Massima qualità e capacità di ragionamento - Per quotazioni complesse',
    inputCostPer1M: 15.00,
    outputCostPer1M: 75.00,
    recommendedFor: ['Quotazioni complesse', 'Architetture multi-layer', 'Massima accuratezza'],
    maxTokens: 8192,
  },
  'claude-haiku-4': {
    id: 'eu.anthropic.claude-haiku-4-20250514-v1:0',
    name: 'claude-haiku-4',
    displayName: 'Claude Haiku 4',
    description: 'Velocità e costo ridotto - Per quotazioni semplici',
    inputCostPer1M: 0.80,
    outputCostPer1M: 4.00,
    recommendedFor: ['Quotazioni semplici', 'Test rapidi', 'Costo minimo'],
    maxTokens: 8192,
  },
};

export const DEFAULT_MODEL = 'claude-sonnet-4.5';

/**
 * Get model configuration by name
 */
export function getModelConfig(modelName: string): ModelConfig {
  const config = AVAILABLE_MODELS[modelName];
  if (!config) {
    throw new Error(`Model ${modelName} not found. Available models: ${Object.keys(AVAILABLE_MODELS).join(', ')}`);
  }
  return config;
}

/**
 * Get model configuration by Bedrock ID
 */
export function getModelConfigById(modelId: string): ModelConfig | undefined {
  return Object.values(AVAILABLE_MODELS).find((model) => model.id === modelId);
}

/**
 * Calculate cost for given token usage
 */
export function calculateCost(modelName: string, inputTokens: number, outputTokens: number): number {
  const model = getModelConfig(modelName);
  const inputCost = (inputTokens / 1_000_000) * model.inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * model.outputCostPer1M;
  return inputCost + outputCost;
}

/**
 * Get all available models as array
 */
export function getAllModels(): ModelConfig[] {
  return Object.values(AVAILABLE_MODELS);
}
