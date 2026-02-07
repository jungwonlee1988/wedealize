import { IsString, IsOptional, IsNotEmpty, IsNumber, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCreditDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  buyerName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productSku?: string;

  @ApiProperty({ description: 'damaged, quality, short, wrong, expired, other' })
  @IsNotEmpty()
  @IsString()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  affectedQuantity?: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 'draft' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateCreditDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buyerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productSku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  affectedQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'draft, approved, used, cancelled' })
  @IsOptional()
  @IsString()
  status?: string;
}
