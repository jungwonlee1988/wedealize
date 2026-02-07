import { Controller, Post, Get, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, SendVerificationDto, VerifyEmailDto } from './dto/register.dto';
import { LoginDto, GoogleAuthDto, ForgotPasswordDto, ResetPasswordDto } from './dto/login.dto';
import { InviteTeamMemberDto, AcceptInviteDto, UpdateTeamMemberDto } from './dto/invite.dto';
import { SwitchWorkspaceDto } from './dto/workspace.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

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

  @Post('auth/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ==================== Workspace Switching ====================

  @Get('auth/my-workspaces')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all workspaces accessible by the current user' })
  @ApiResponse({ status: 200, description: 'Workspaces retrieved' })
  async getMyWorkspaces(@Request() req) {
    return this.authService.getMyWorkspaces(req.user.actor_email);
  }

  @Post('auth/switch-workspace')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Switch to a different workspace' })
  @ApiResponse({ status: 200, description: 'Workspace switched, new token issued' })
  async switchWorkspace(@Request() req, @Body() dto: SwitchWorkspaceDto) {
    return this.authService.switchWorkspace(req.user.actor_email, dto.supplierId);
  }

  // ==================== Team Management ====================

  @Post('team/invite')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invite a team member' })
  @ApiResponse({ status: 200, description: 'Invitation sent' })
  async inviteTeamMember(@Request() req, @Body() dto: InviteTeamMemberDto) {
    return this.authService.inviteTeamMember(req.user.id, dto);
  }

  @Get('team/invite-info')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get invitation info by token' })
  @ApiResponse({ status: 200, description: 'Invitation info retrieved' })
  async getInviteInfo(@Query('token') token: string) {
    return this.authService.getInviteInfo(token);
  }

  @Post('team/accept-invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a team invitation' })
  @ApiResponse({ status: 200, description: 'Invitation accepted' })
  async acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.authService.acceptInvite(dto.token);
  }

  @Get('team/members')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get team members list' })
  @ApiResponse({ status: 200, description: 'Team members retrieved' })
  async getTeamMembers(@Request() req) {
    return this.authService.getTeamMembers(req.user.id);
  }

  @Patch('team/members/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update team member role' })
  @ApiResponse({ status: 200, description: 'Team member updated' })
  async updateTeamMember(@Request() req, @Param('id') memberId: string, @Body() dto: UpdateTeamMemberDto) {
    return this.authService.updateTeamMember(req.user.id, memberId, dto, req.user.email);
  }

  @Delete('team/members/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove team member' })
  @ApiResponse({ status: 200, description: 'Team member removed' })
  async removeTeamMember(@Request() req, @Param('id') memberId: string) {
    return this.authService.removeTeamMember(req.user.id, memberId, req.user.email);
  }

  @Post('team/resend-invite/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend team invitation' })
  @ApiResponse({ status: 200, description: 'Invitation resent' })
  async resendInvite(@Request() req, @Param('id') memberId: string) {
    return this.authService.resendInvite(req.user.id, memberId);
  }
}
