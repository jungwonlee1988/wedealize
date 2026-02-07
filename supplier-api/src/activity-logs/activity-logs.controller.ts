import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ActivityLogsService } from './activity-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Activity Logs')
@Controller('api/v1/supplier')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ActivityLogsController {
  constructor(private activityLogsService: ActivityLogsService) {}

  @Get('activity-logs')
  @ApiOperation({ summary: 'Get activity logs with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Activity logs retrieved' })
  async getActivityLogs(
    @Request() req,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityLogsService.getActivityLogs(req.user.id, {
      category,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('activity-logs/recent')
  @ApiOperation({ summary: 'Get recent activity for dashboard' })
  @ApiResponse({ status: 200, description: 'Recent activity retrieved' })
  async getRecentActivity(@Request() req) {
    return this.activityLogsService.getRecentActivity(req.user.id);
  }
}
