import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseCommandInput,
  ConverseCommandOutput,
  Message,
  ContentBlock,
  SystemContentBlock,
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
  topP?: number;
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
   * Invoke Claude model on AWS Bedrock using Converse API
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
    const topP = request.topP ?? 0.999;

    // Convert messages to Converse API format
    const messages: Message[] = request.messages.map(msg => ({
      role: msg.role,
      content: [{ text: msg.content }],
    }));

    // Prepare system prompt if provided
    const system: SystemContentBlock[] | undefined = request.system
      ? [{ text: request.system }]
      : undefined;

    const input: ConverseCommandInput = {
      modelId: this.modelId,
      messages,
      system,
      inferenceConfig: {
        maxTokens,
        temperature,
        topP,
      },
    };

    const startTime = Date.now();

    try {
      this.logger.debug(`Invoking Bedrock model ${this.modelId} via Converse API`);

      const command = new ConverseCommand(input);
      const response: ConverseCommandOutput = await this.client.send(command);

      const latencyMs = Date.now() - startTime;

      // Extract text content from response
      const textContent = this.extractTextContent(response.output?.message?.content);

      this.logger.log(
        `Bedrock Converse request successful (${latencyMs}ms, input: ${response.usage?.inputTokens}, output: ${response.usage?.outputTokens})`,
      );

      // Reset circuit breaker on success
      this.consecutiveFailures = 0;

      return {
        content: textContent,
        stopReason: response.stopReason || 'end_turn',
        usage: {
          inputTokens: response.usage?.inputTokens || 0,
          outputTokens: response.usage?.outputTokens || 0,
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.consecutiveFailures++;

      this.logger.error(
        `Bedrock Converse request failed (${latencyMs}ms, failures: ${this.consecutiveFailures}): ${error.message}`,
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
   * Extract text content from Converse API response
   */
  private extractTextContent(content: ContentBlock[] | undefined): string {
    if (!content || content.length === 0) {
      return '';
    }

    // Concatenate all text blocks
    return content
      .filter(block => block.text !== undefined)
      .map(block => block.text)
      .join('\n');
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
