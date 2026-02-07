import { Controller, Post, Get, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/create-account.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Accounts')
@Controller('api/v1/supplier')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AccountsController {
  constructor(private accountsService: AccountsService) {}

  @Post('accounts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an account' })
  @ApiResponse({ status: 201, description: 'Account created' })
  async createAccount(@Request() req, @Body() dto: CreateAccountDto) {
    return this.accountsService.createAccount(req.user.id, dto, req.user.email);
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Get account list' })
  @ApiResponse({ status: 200, description: 'Account list retrieved' })
  async getAccounts(
    @Request() req,
    @Query('search') search?: string,
  ) {
    return this.accountsService.getAccounts(req.user.id, { search });
  }

  @Get('accounts/:id')
  @ApiOperation({ summary: 'Get account detail' })
  @ApiResponse({ status: 200, description: 'Account detail retrieved' })
  async getAccountById(@Request() req, @Param('id') id: string) {
    return this.accountsService.getAccountById(req.user.id, id);
  }

  @Patch('accounts/:id')
  @ApiOperation({ summary: 'Update account' })
  @ApiResponse({ status: 200, description: 'Account updated' })
  async updateAccount(@Request() req, @Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.accountsService.updateAccount(req.user.id, id, dto, req.user.email);
  }

  @Delete('accounts/:id')
  @ApiOperation({ summary: 'Delete account' })
  @ApiResponse({ status: 200, description: 'Account deleted' })
  async deleteAccount(@Request() req, @Param('id') id: string) {
    return this.accountsService.deleteAccount(req.user.id, id, req.user.email);
  }
}
