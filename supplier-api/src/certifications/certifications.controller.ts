import { Controller, Post, Get, Patch, Delete, Body, Param, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CertificationsService } from './certifications.service';
import { CreateCertificationDto, UpdateCertificationDto } from './dto/create-certification.dto';
import { CreateRenewalDto } from './dto/create-renewal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Certifications')
@Controller('api/v1/supplier')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CertificationsController {
  constructor(private certificationsService: CertificationsService) {}

  @Post('certifications')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a company certification' })
  @ApiResponse({ status: 201, description: 'Certification created' })
  async createCertification(@Request() req, @Body() dto: CreateCertificationDto) {
    return this.certificationsService.createCertification(req.user.id, dto);
  }

  @Get('certifications')
  @ApiOperation({ summary: 'Get company certifications' })
  @ApiResponse({ status: 200, description: 'Certifications retrieved' })
  async getCertifications(@Request() req) {
    return this.certificationsService.getCertifications(req.user.id);
  }

  @Get('certifications/:id')
  @ApiOperation({ summary: 'Get a single certification' })
  @ApiResponse({ status: 200, description: 'Certification retrieved' })
  async getCertification(@Request() req, @Param('id') id: string) {
    return this.certificationsService.getCertification(req.user.id, id);
  }

  @Get('certifications/:id/renewals')
  @ApiOperation({ summary: 'Get renewal history for a certification' })
  @ApiResponse({ status: 200, description: 'Renewals retrieved' })
  async getRenewals(@Request() req, @Param('id') id: string) {
    return this.certificationsService.getRenewals(req.user.id, id);
  }

  @Post('certifications/:id/renewals')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a renewal for a certification' })
  @ApiResponse({ status: 201, description: 'Renewal created' })
  async createRenewal(@Request() req, @Param('id') id: string, @Body() dto: CreateRenewalDto) {
    return this.certificationsService.createRenewal(req.user.id, id, dto);
  }

  @Patch('certifications/:id')
  @ApiOperation({ summary: 'Update a company certification' })
  @ApiResponse({ status: 200, description: 'Certification updated' })
  async updateCertification(@Request() req, @Param('id') id: string, @Body() dto: UpdateCertificationDto) {
    return this.certificationsService.updateCertification(req.user.id, id, dto);
  }

  @Delete('certifications/:id')
  @ApiOperation({ summary: 'Delete a company certification' })
  @ApiResponse({ status: 200, description: 'Certification deleted' })
  async deleteCertification(@Request() req, @Param('id') id: string) {
    return this.certificationsService.deleteCertification(req.user.id, id);
  }
}
