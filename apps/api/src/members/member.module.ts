import { Module } from '@nestjs/common';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { AuditModule } from '../audit/audit.module';

@Module({ imports: [AuditModule], controllers: [MemberController], providers: [MemberService] })
export class MemberModule {}
