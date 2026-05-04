import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';

export interface BedrockMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface BedrockRequest {
  messages: BedrockMessage[];
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface BedrockResponse {
  content: string;
  stopReason: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

@Injectable()
export class BedrockService {
  private readonly logger = new Logger(BedrockService.name);
  private readonly client: BedrockRuntimeClient;
  private readonly modelId: string;
  private readonly defaultMaxTokens: number;
  private readonly timeoutMs: number;

  // Circuit breaker state
  private consecutiveFailures = 0;
  private circuitOpen = false;
  private circuitOpenUntil: number = 0;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('aws.region');
    this.modelId = this.configService.get<string>('aws.bedrockModelId');
    this.defaultMaxTokens = this.configService.get<number>('aws.maxTokens');
    this.timeoutMs = this.configService.get<number>('aws.timeoutMs');

    this.client = new BedrockRuntimeClient({
      region,
      requestHandler: {
        requestTimeout: this.timeoutMs,
      },
    });

    this.logger.log(`Bedrock client initialized (region: ${region}, model: ${this.modelId})`);
  }

  /**
   * Invoke Claude model on AWS Bedrock
   */
  async invoke(request: BedrockRequest): Promise<BedrockResponse> {
    // Check circuit breaker
    if (this.circuitOpen) {
      const now = Date.now();
      if (now < this.circuitOpenUntil) {
        throw new Error(
          `Circuit breaker open until ${new Date(this.circuitOpenUntil).toISOString()}`,
        );
      } else {
        this.logger.log('Circuit breaker half-open, attempting request');
        this.circuitOpen = false;
        this.consecutiveFailures = 0;
      }
    }

    const maxTokens = request.maxTokens || this.defaultMaxTokens;
    const temperature = request.temperature ?? 1.0;

    // Bedrock Messages API format
    const body = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: maxTokens,
      temperature,
      messages: request.messages,
      ...(request.system && { system: request.system }),
    };

    const input: InvokeModelCommandInput = {
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(body),
    };

    const startTime = Date.now();

    try {
      this.logger.debug(`Invoking Bedrock model ${this.modelId}`);

      const command = new InvokeModelCommand(input);
      const response = await this.client.send(command);

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      const latencyMs = Date.now() - startTime;
      this.logger.log(
        `Bedrock request successful (${latencyMs}ms, input: ${responseBody.usage?.input_tokens}, output: ${responseBody.usage?.output_tokens})`,
      );

      // Reset circuit breaker on success
      this.consecutiveFailures = 0;

      return {
        content: responseBody.content[0].text,
        stopReason: responseBody.stop_reason,
        usage: {
          inputTokens: responseBody.usage?.input_tokens || 0,
          outputTokens: responseBody.usage?.output_tokens || 0,
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.consecutiveFailures++;

      this.logger.error(
        `Bedrock request failed (${latencyMs}ms, failures: ${this.consecutiveFailures}): ${error.message}`,
      );

      // Open circuit breaker if threshold exceeded
      const threshold = this.configService.get<number>('circuitBreaker.threshold');
      if (this.consecutiveFailures >= threshold) {
        this.circuitOpen = true;
        const timeoutMs = this.configService.get<number>('circuitBreaker.timeoutMs');
        this.circuitOpenUntil = Date.now() + timeoutMs;
        this.logger.error(
          `Circuit breaker opened after ${this.consecutiveFailures} failures (until ${new Date(this.circuitOpenUntil).toISOString()})`,
        );
      }

      throw error;
    }
  }

  /**
   * Get circuit breaker status (for health checks)
   */
  getCircuitStatus(): { open: boolean; consecutiveFailures: number; openUntil?: string } {
    return {
      open: this.circuitOpen,
      consecutiveFailures: this.consecutiveFailures,
      ...(this.circuitOpen && { openUntil: new Date(this.circuitOpenUntil).toISOString() }),
    };
  }
}
