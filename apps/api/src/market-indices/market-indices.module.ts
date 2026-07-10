import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AnbimaImaB5Client } from './anbima/anbima-ima-b5.client';
import { AnbimaImaB5ConfigService } from './anbima/anbima-ima-b5.config';
import { AnbimaImaB5Parser } from './anbima/anbima-ima-b5.parser';
import { AnbimaImaB5Scheduler } from './anbima/anbima-ima-b5.scheduler';
import { AnbimaImaB5Service } from './anbima/anbima-ima-b5.service';
import { GlobalConfigRepository } from './config/config.repository';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    AnbimaImaB5ConfigService,
    GlobalConfigRepository,
    AnbimaImaB5Client,
    AnbimaImaB5Parser,
    AnbimaImaB5Service,
    AnbimaImaB5Scheduler,
  ],
  exports: [AnbimaImaB5Service],
})
export class MarketIndicesModule {}
