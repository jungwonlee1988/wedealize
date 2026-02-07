import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SwitchWorkspaceDto {
  @ApiProperty({ description: 'Target workspace supplier ID' })
  @IsNotEmpty()
  @IsUUID()
  supplierId: string;
}
