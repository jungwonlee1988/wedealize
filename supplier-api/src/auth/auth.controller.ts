import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, SendVerificationDto, VerifyEmailDto } from './dto/register.dto';
import { LoginDto, GoogleAuthDto, ForgotPasswordDto } from './dto/login.dto';

@ApiTags('Authentication')
@Controller('api/v1/supplier')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('auth/send-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send email verification code' })
  @ApiResponse({ status: 200, description: 'Verification code sent' })
  async sendVerification(@Body() dto: SendVerificationDto) {
    return this.authService.sendVerificationCode(dto);
  }

  @Post('auth/verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email and complete registration' })
  @ApiResponse({ status: 200, description: 'Registration successful' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmailAndRegister(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('auth/google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with Google OAuth' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async googleAuth(@Body() dto: GoogleAuthDto) {
    return this.authService.googleAuth(dto);
  }

  @Post('auth/forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent if account exists' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }
}
