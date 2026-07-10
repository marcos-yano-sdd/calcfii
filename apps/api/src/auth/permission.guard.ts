import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSION_KEY } from './require-permission.decorator';
import { hasPermission, Permission } from './permissions';
import { AuthenticatedRequest } from './authenticated-request';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<Permission | undefined>(REQUIRED_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!permission) return true;
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.auth || !hasPermission(req.auth.role, permission)) {
      if (req.auth) {
        await this.audit.recordAuditEvent(req.auth, 'authorization.denied', 'route', undefined, { permission });
      }
      throw new ForbiddenException('Forbidden');
    }
    return true;
  }
}
