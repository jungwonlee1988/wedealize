import { IsString, IsOptional, IsNotEmpty, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInquiryDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  buyerCompany: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buyerContact?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buyerEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buyerPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buyerCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ type: [String], description: 'Array of product UUIDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  productIds?: string[];
}

export class UpdateInquiryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buyerCompany?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buyerContact?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buyerEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buyerPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buyerCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'active, responded, closed' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ type: [String], description: 'Array of product UUIDs (replaces existing)' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  productIds?: string[];
}
