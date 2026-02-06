import { IsArray, IsOptional, IsString, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CatalogImageDto {
  @ApiProperty()
  @IsString()
  data: string; // base64 JPEG

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  pageNumber?: number;
}

export class ExtractCatalogDto {
  @ApiProperty({ type: [CatalogImageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CatalogImageDto)
  images: CatalogImageDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  batchIndex?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  totalBatches?: number;
}
