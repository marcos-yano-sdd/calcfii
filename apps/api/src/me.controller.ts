import { Controller, Get, Req } from '@nestjs/common';
import { AuthenticatedRequest } from './auth/authenticated-request';
import { TenantService } from './tenants/tenant.service';

@Controller('v1/me')
export class MeController {
  constructor(private readonly tenants: TenantService) {}

  @Get()
  async me(@Req() req: AuthenticatedRequest) {
    const auth = req.auth!;
    const [activeTenant, tenants] = await Promise.all([
      this.tenants.current(auth),
      this.tenants.listForUser(auth.clerkUserId),
    ]);
    return {
      user: { clerkUserId: auth.clerkUserId, email: auth.email ?? null },
      activeTenant,
      role: auth.role,
      tenants,
    };
  }
}
