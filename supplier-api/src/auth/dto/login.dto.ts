import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'supplier@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsNotEmpty()
  @IsString()
  password: string;
}

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google ID Token' })
  @IsNotEmpty()
  @IsString()
  credential: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'supplier@example.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  password: string;
}
