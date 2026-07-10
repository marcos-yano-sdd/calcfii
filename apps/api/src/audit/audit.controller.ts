import { Controller, Get, Query, Req } from '@nestjs/common';
import { RequirePermission } from '../auth/require-permission.decorator';
import { AuthenticatedRequest } from '../auth/authenticated-request';
import { AuditService } from './audit.service';

@Controller('v1/audit-events')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @RequirePermission('audit:read')
  @Get()
  list(@Req() req: AuthenticatedRequest, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.audit.list(req.auth!, Number(page ?? 1), Number(pageSize ?? 20));
  }
}
