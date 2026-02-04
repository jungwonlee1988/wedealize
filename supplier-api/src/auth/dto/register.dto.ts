import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Tuscany Foods Inc.' })
  @IsNotEmpty()
  @IsString()
  companyName: string;

  @ApiProperty({ example: 'supplier@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'IT', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: 'oils', required: false })
  @IsOptional()
  @IsString()
  category?: string;
}

export class SendVerificationDto {
  @ApiProperty({ example: 'supplier@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Tuscany Foods Inc.' })
  @IsNotEmpty()
  @IsString()
  companyName: string;
}

export class VerifyEmailDto {
  @ApiProperty({ example: 'supplier@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ example: 'Tuscany Foods Inc.' })
  @IsNotEmpty()
  @IsString()
  companyName: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'IT', required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ example: 'oils', required: false })
  @IsOptional()
  @IsString()
  category?: string;
}
