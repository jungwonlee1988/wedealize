import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const adminKey = request.headers['x-admin-key'];
    const validKey = this.configService.get<string>('adminKey');

    if (!adminKey || adminKey !== validKey) {
      throw new UnauthorizedException('Invalid admin key');
    }

    return true;
  }
}
