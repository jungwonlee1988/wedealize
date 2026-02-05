import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteTeamMemberDto {
  @ApiProperty({ example: 'member@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'member', enum: ['admin', 'member', 'viewer'] })
  @IsIn(['admin', 'member', 'viewer'])
  role: string;

  @ApiProperty({ example: 'Welcome to our team!', required: false })
  @IsOptional()
  @IsString()
  message?: string;
}

export class AcceptInviteDto {
  @ApiProperty({ description: 'Invite token from email' })
  @IsNotEmpty()
  @IsString()
  token: string;
}

export class UpdateTeamMemberDto {
  @ApiProperty({ example: 'admin', enum: ['admin', 'member', 'viewer'] })
  @IsIn(['admin', 'member', 'viewer'])
  role: string;
}
