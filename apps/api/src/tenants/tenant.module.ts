import { Module, forwardRef } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [forwardRef(() => AuditModule)],
  providers: [TenantContextService, TenantService],
  controllers: [TenantController],
  exports: [TenantContextService, TenantService],
})
export class TenantModule {}
