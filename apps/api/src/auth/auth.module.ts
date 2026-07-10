import { Module } from '@nestjs/common';
import { TenantModule } from '../tenants/tenant.module';

@Module({ imports: [TenantModule] })
export class AuthModule {}
