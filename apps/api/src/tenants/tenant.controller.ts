import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { RequirePermission } from '../auth/require-permission.decorator';
import { AuthenticatedRequest } from '../auth/authenticated-request';
import { TenantService } from './tenant.service';

@Controller('v1/tenants')
export class TenantController {
  constructor(private readonly tenants: TenantService) {}

  @RequirePermission('tenant:read')
  @Get('current')
  current(@Req() req: AuthenticatedRequest) {
    return this.tenants.current(req.auth!);
  }

  @RequirePermission('tenant:update')
  @Patch('current')
  update(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    return this.tenants.updateCurrent(req.auth!, body);
  }
}
