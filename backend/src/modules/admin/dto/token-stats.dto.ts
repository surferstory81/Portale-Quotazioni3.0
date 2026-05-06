export class TokenStatsDto {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalEstimatedCostUsd: number;
  totalEstimations: number;
  avgInputTokensPerEstimation: number;
  avgOutputTokensPerEstimation: number;
  avgCostPerEstimation: number;
  lastUpdated: Date;
}
