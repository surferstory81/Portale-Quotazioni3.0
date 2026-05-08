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
  Tool,
  ToolResultBlock,
} from '@aws-sdk/client-bedrock-runtime';
import { NodeHttpHandler } from '@smithy/node-http-handler';
// Note: using require() for https-proxy-agent due to moduleResolution issue
const { HttpsProxyAgent } = require('https-proxy-agent');

export interface BedrockMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface BedrockTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface BedrockRequest {
  messages: BedrockMessage[];
  system?: string;
  systemCacheable?: boolean; // Enable prompt caching for system prompt
  tools?: BedrockTool[]; // Available tools for function calling
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  modelId?: string; // Override default model for this request
}

export interface ToolUseBlock {
  toolUseId: string;
  name: string;
  input: Record<string, any>;
}

export interface BedrockResponse {
  content: string;
  stopReason: string;
  toolUse?: ToolUseBlock[]; // Tool calls requested by the model
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
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

    // Configure proxy if environment variables are set
    const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    const requestHandler = proxyUrl
      ? new NodeHttpHandler({
          httpsAgent: new HttpsProxyAgent(proxyUrl),
          httpAgent: new HttpsProxyAgent(proxyUrl),
          connectionTimeout: 10000,
          requestTimeout: this.timeoutMs,
        })
      : {
          requestTimeout: this.timeoutMs,
        };

    this.client = new BedrockRuntimeClient({
      region,
      requestHandler,
    });

    if (proxyUrl) {
      this.logger.log(`Bedrock client initialized with proxy ${proxyUrl} (region: ${region}, model: ${this.modelId})`);
    } else {
      this.logger.log(`Bedrock client initialized (region: ${region}, model: ${this.modelId})`);
    }
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
    // Note: topP removed - Claude Sonnet 4.5 doesn't accept both temperature and topP

    // Convert messages to Converse API format
    const messages: Message[] = request.messages.map(msg => ({
      role: msg.role,
      content: [{ text: msg.content }],
    }));

    // Prepare system prompt with optional caching
    const system: SystemContentBlock[] | undefined = request.system
      ? [
          {
            text: request.system,
            // Enable prompt caching if requested (reduces costs by 90%)
            ...(request.systemCacheable && { cacheControl: { type: 'ephemeral' } }),
          },
        ]
      : undefined;

    // Prepare tools if provided
    const toolConfig = request.tools
      ? {
          tools: request.tools.map(tool => ({
            toolSpec: {
              name: tool.name,
              description: tool.description,
              inputSchema: {
                json: tool.inputSchema,
              },
            },
          })),
        }
      : undefined;

    // Use override modelId if provided, otherwise use default
    const modelIdToUse = request.modelId || this.modelId;

    const input: ConverseCommandInput = {
      modelId: modelIdToUse,
      messages,
      system,
      toolConfig,
      inferenceConfig: {
        maxTokens,
        temperature,
        // topP not included - model doesn't support both parameters
      },
    };

    const startTime = Date.now();

    try {
      this.logger.debug(`Invoking Bedrock model ${modelIdToUse} via Converse API`);

      const command = new ConverseCommand(input);
      const response: ConverseCommandOutput = await this.client.send(command);

      const latencyMs = Date.now() - startTime;

      // Extract text content and tool use from response
      const textContent = this.extractTextContent(response.output?.message?.content);
      const toolUse = this.extractToolUse(response.output?.message?.content);

      // Log cache usage if present
      const cacheCreated = (response.usage as any)?.cacheCreationInputTokens || 0;
      const cacheRead = (response.usage as any)?.cacheReadInputTokens || 0;
      const cacheInfo = cacheCreated > 0 ? ` cache-created: ${cacheCreated},` : cacheRead > 0 ? ` cache-hit: ${cacheRead},` : '';
      const toolInfo = toolUse && toolUse.length > 0 ? ` tools-called: ${toolUse.length},` : '';

      this.logger.log(
        `Bedrock Converse request successful (${latencyMs}ms,${cacheInfo}${toolInfo} input: ${response.usage?.inputTokens}, output: ${response.usage?.outputTokens})`,
      );

      // Reset circuit breaker on success
      this.consecutiveFailures = 0;

      return {
        content: textContent,
        stopReason: response.stopReason || 'end_turn',
        toolUse: toolUse.length > 0 ? toolUse : undefined,
        usage: {
          inputTokens: response.usage?.inputTokens || 0,
          outputTokens: response.usage?.outputTokens || 0,
          cacheCreationInputTokens: cacheCreated,
          cacheReadInputTokens: cacheRead,
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
   * Extract tool use requests from Converse API response
   */
  private extractToolUse(content: ContentBlock[] | undefined): ToolUseBlock[] {
    if (!content || content.length === 0) {
      return [];
    }

    // Extract all tool use blocks
    return content
      .filter(block => (block as any).toolUse !== undefined)
      .map(block => {
        const toolUse = (block as any).toolUse;
        return {
          toolUseId: toolUse.toolUseId,
          name: toolUse.name,
          input: toolUse.input,
        };
      });
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
