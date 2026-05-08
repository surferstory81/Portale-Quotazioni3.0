export interface AIModel {
  id: string;
  name: string;
  displayName: string;
  description: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
  recommendedFor: string[];
}

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'eu.anthropic.claude-sonnet-4-5-20250929-v1:0',
    name: 'claude-sonnet-4.5',
    displayName: 'Claude Sonnet 4.5',
    description: 'Bilanciamento ottimale tra qualità e costo',
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
    recommendedFor: ['Quotazioni standard', 'Uso quotidiano', 'Miglior rapporto qualità/prezzo'],
  },
  {
    id: 'eu.anthropic.claude-opus-4-20250514-v1:0',
    name: 'claude-opus-4',
    displayName: 'Claude Opus 4',
    description: 'Massima qualità e capacità di ragionamento',
    inputCostPer1M: 15.00,
    outputCostPer1M: 75.00,
    recommendedFor: ['Quotazioni complesse', 'Architetture multi-layer', 'Massima accuratezza'],
  },
  {
    id: 'eu.anthropic.claude-haiku-4-20250514-v1:0',
    name: 'claude-haiku-4',
    displayName: 'Claude Haiku 4',
    description: 'Velocità e costo ridotto',
    inputCostPer1M: 0.80,
    outputCostPer1M: 4.00,
    recommendedFor: ['Quotazioni semplici', 'Test rapidi', 'Costo minimo'],
  },
];

export const DEFAULT_MODEL_ID = 'eu.anthropic.claude-sonnet-4-5-20250929-v1:0';
