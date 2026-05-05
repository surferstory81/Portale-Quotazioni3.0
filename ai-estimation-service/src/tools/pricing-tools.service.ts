import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { BedrockTool } from '../bedrock/bedrock.service';

export interface ToolExecutionResult {
  toolUseId: string;
  content: string;
}

@Injectable()
export class PricingToolsService {
  private readonly logger = new Logger(PricingToolsService.name);
  private readonly awsPricingApiEnabled: boolean;
  private readonly azurePricingApiEnabled: boolean;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.awsPricingApiEnabled = this.configService.get<boolean>('tools.awsPricing') || false;
    this.azurePricingApiEnabled = this.configService.get<boolean>('tools.azurePricing') || false;

    if (this.awsPricingApiEnabled) {
      this.logger.log('AWS Pricing API tool enabled');
    }
    if (this.azurePricingApiEnabled) {
      this.logger.log('Azure Pricing API tool enabled');
    }
  }

  /**
   * Get list of available tools
   */
  getAvailableTools(): BedrockTool[] {
    const tools: BedrockTool[] = [];

    if (this.awsPricingApiEnabled) {
      tools.push({
        name: 'get_aws_ec2_pricing',
        description: 'Fetch current AWS EC2 instance pricing for a specific region and instance type',
        inputSchema: {
          type: 'object',
          properties: {
            region: {
              type: 'string',
              description: 'AWS region (e.g., eu-central-1, us-east-1)',
            },
            instanceType: {
              type: 'string',
              description: 'EC2 instance type (e.g., t3.medium, m5.large)',
            },
            operatingSystem: {
              type: 'string',
              description: 'Operating system (Linux or Windows)',
              enum: ['Linux', 'Windows'],
            },
          },
          required: ['region', 'instanceType', 'operatingSystem'],
        },
      });
    }

    if (this.azurePricingApiEnabled) {
      tools.push({
        name: 'get_azure_vm_pricing',
        description: 'Fetch current Azure VM pricing for a specific region and VM size',
        inputSchema: {
          type: 'object',
          properties: {
            region: {
              type: 'string',
              description: 'Azure region (e.g., westeurope, eastus)',
            },
            vmSize: {
              type: 'string',
              description: 'Azure VM size (e.g., Standard_B2s, Standard_D4s_v3)',
            },
            operatingSystem: {
              type: 'string',
              description: 'Operating system (Linux or Windows)',
              enum: ['Linux', 'Windows'],
            },
          },
          required: ['region', 'vmSize', 'operatingSystem'],
        },
      });
    }

    return tools;
  }

  /**
   * Execute a tool call
   */
  async executeTool(toolName: string, toolInput: Record<string, any>): Promise<string> {
    this.logger.log(`Executing tool: ${toolName} with input:`, toolInput);

    switch (toolName) {
      case 'get_aws_ec2_pricing':
        return this.getAwsEc2Pricing(
          toolInput.region,
          toolInput.instanceType,
          toolInput.operatingSystem,
        );

      case 'get_azure_vm_pricing':
        return this.getAzureVmPricing(
          toolInput.region,
          toolInput.vmSize,
          toolInput.operatingSystem,
        );

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  /**
   * Get AWS EC2 pricing (using AWS Price List API)
   */
  private async getAwsEc2Pricing(
    region: string,
    instanceType: string,
    operatingSystem: string,
  ): Promise<string> {
    try {
      // In production, this would call AWS Price List API
      // For now, return mock data for demonstration
      this.logger.log(`Fetching AWS EC2 pricing: ${region}/${instanceType}/${operatingSystem}`);

      // Mock pricing data (in production, call actual AWS API)
      const mockPricing = {
        't3.medium': { Linux: 0.0416, Windows: 0.0816 },
        't3.large': { Linux: 0.0832, Windows: 0.1232 },
        'm5.large': { Linux: 0.096, Windows: 0.176 },
        'm5.xlarge': { Linux: 0.192, Windows: 0.352 },
        'c5.xlarge': { Linux: 0.17, Windows: 0.34 },
      };

      const price = mockPricing[instanceType]?.[operatingSystem];

      if (!price) {
        return JSON.stringify({
          error: `Pricing not available for ${instanceType} with ${operatingSystem}`,
        });
      }

      return JSON.stringify({
        region,
        instanceType,
        operatingSystem,
        pricing: {
          onDemandHourlyUSD: price,
          onDemandMonthlyUSD: price * 730, // ~730 hours per month
          currency: 'USD',
          lastUpdated: new Date().toISOString(),
        },
        note: 'On-demand pricing. Reserved instances and Savings Plans may offer lower rates.',
      });
    } catch (error) {
      this.logger.error(`Failed to fetch AWS pricing: ${error.message}`);
      return JSON.stringify({ error: error.message });
    }
  }

  /**
   * Get Azure VM pricing (using Azure Retail Prices API)
   */
  private async getAzureVmPricing(
    region: string,
    vmSize: string,
    operatingSystem: string,
  ): Promise<string> {
    try {
      // In production, this would call Azure Retail Prices API
      // https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices
      this.logger.log(`Fetching Azure VM pricing: ${region}/${vmSize}/${operatingSystem}`);

      // Mock pricing data
      const mockPricing = {
        'Standard_B2s': { Linux: 0.0416, Windows: 0.0832 },
        'Standard_D2s_v3': { Linux: 0.096, Windows: 0.192 },
        'Standard_D4s_v3': { Linux: 0.192, Windows: 0.384 },
        'Standard_E4s_v3': { Linux: 0.252, Windows: 0.504 },
      };

      const price = mockPricing[vmSize]?.[operatingSystem];

      if (!price) {
        return JSON.stringify({
          error: `Pricing not available for ${vmSize} with ${operatingSystem}`,
        });
      }

      return JSON.stringify({
        region,
        vmSize,
        operatingSystem,
        pricing: {
          payAsYouGoHourlyUSD: price,
          payAsYouGoMonthlyUSD: price * 730,
          currency: 'USD',
          lastUpdated: new Date().toISOString(),
        },
        note: 'Pay-as-you-go pricing. Reserved instances may offer savings up to 72%.',
      });
    } catch (error) {
      this.logger.error(`Failed to fetch Azure pricing: ${error.message}`);
      return JSON.stringify({ error: error.message });
    }
  }
}
