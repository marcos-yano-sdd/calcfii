import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyToken } from '@clerk/backend';
import { randomUUID } from 'crypto';
import { IS_PUBLIC_KEY } from './public.decorator';
import { AuthenticatedRequest } from './authenticated-request';
import { TenantContextService } from '../tenants/tenant-context.service';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantContext: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) {
      return true;
    }

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    req.correlationId = (req.headers['x-correlation-id'] as string | undefined) ?? randomUUID();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');

    try {
      const token = header.slice('Bearer '.length);
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
        jwtKey: process.env.CLERK_JWT_KEY || undefined,
      });
      const clerkUserId = String(payload.sub);
      const clerkOrgId = String(payload.org_id ?? req.headers['x-clerk-org-id'] ?? '');
      if (!clerkOrgId) throw new UnauthorizedException('Missing active organization');
      req.auth = await this.tenantContext.resolve({
        clerkUserId,
        clerkOrgId,
        email: typeof payload.email === 'string' ? payload.email : undefined,
      });
      return true;
    } catch {
      throw new UnauthorizedException('Invalid bearer token');
    }
  }
}
