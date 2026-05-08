import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EstimationData, ValidationData } from '../../../entities/ai-estimation.entity';

export class GenerateEstimationDto {
  @ApiProperty({
    description: 'ID della quotazione',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  quotationId: string;

  @ApiProperty({
    description: 'Dati di stima generati dall\'Estimation Agent',
  })
  @IsObject()
  @IsNotEmpty()
  estimationData: EstimationData;

  @ApiProperty({
    description: 'Numero di input tokens usati',
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  inputTokens?: number;

  @ApiProperty({
    description: 'Numero di output tokens usati',
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  outputTokens?: number;

  @ApiProperty({
    description: 'Costo stimato in USD',
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  estimatedCostUsd?: number;
}

export class ValidateEstimationDto {
  @ApiProperty({
    description: 'ID della stima AI',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  estimationId: string;

  @ApiProperty({
    description: 'Report di validazione dal Validation Agent',
  })
  @IsObject()
  @IsNotEmpty()
  validationData: ValidationData;
}

export class ApproveEstimationDto {
  @ApiProperty({
    description: 'Note dell\'amministratore (opzionali)',
    required: false,
  })
  @IsString()
  @IsOptional()
  adminNotes?: string;
}

export class RejectEstimationDto {
  @ApiProperty({
    description: 'Motivazione del rifiuto (obbligatoria)',
    example: 'Costi fuori budget, necessaria rivalutazione',
  })
  @IsString()
  @IsNotEmpty()
  adminNotes: string;
}
