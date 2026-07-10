import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenants/tenant.module';
import { MemberModule } from './members/member.module';
import { AuditModule } from './audit/audit.module';
import { MarketIndicesModule } from './market-indices/market-indices.module';
import { HealthController } from './health.controller';
import { MeController } from './me.controller';
import { ClerkWebhookController } from './webhooks/clerk-webhook.controller';
import { ClerkAuthGuard } from './auth/clerk-auth.guard';
import { PermissionGuard } from './auth/permission.guard';

@Module({
  imports: [DbModule, AuthModule, TenantModule, MemberModule, AuditModule, MarketIndicesModule],
  controllers: [HealthController, MeController, ClerkWebhookController],
  providers: [
    { provide: APP_GUARD, useClass: ClerkAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
