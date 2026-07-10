import { Controller, Get, Param, Patch, Query, Body, Req } from '@nestjs/common';
import { RequirePermission } from '../auth/require-permission.decorator';
import { AuthenticatedRequest } from '../auth/authenticated-request';
import { MemberService } from './member.service';

@Controller('v1/members')
export class MemberController {
  constructor(private readonly members: MemberService) {}

  @RequirePermission('member:read')
  @Get()
  list(@Req() req: AuthenticatedRequest, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.members.list(req.auth!, Number(page ?? 1), Number(pageSize ?? 20));
  }

  @RequirePermission('member:manage')
  @Patch(':memberId/role')
  updateRole(@Req() req: AuthenticatedRequest, @Param('memberId') memberId: string, @Body() body: unknown) {
    return this.members.updateRole(req.auth!, memberId, body);
  }
}
