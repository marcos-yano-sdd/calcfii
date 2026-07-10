import { Body, Controller, Headers, HttpCode, Post, BadRequestException, Inject } from '@nestjs/common';
import { Webhook } from 'svix';
import { Pool } from 'pg';
import { Public } from '../auth/public.decorator';
import { PG_POOL } from '../db/db.module';

@Controller('webhooks/clerk')
export class ClerkWebhookController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Public()
  @Post()
  @HttpCode(202)
  async receive(@Headers() headers: Record<string, string | undefined>, @Body() body: unknown) {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) throw new BadRequestException('Webhook secret not configured');
    const payload = JSON.stringify(body);
    try {
      const event = new Webhook(secret).verify(payload, {
        'svix-id': headers['svix-id'] ?? '',
        'svix-timestamp': headers['svix-timestamp'] ?? '',
        'svix-signature': headers['svix-signature'] ?? '',
      }) as { id: string; type: string; data: Record<string, unknown> };
      await this.pool.query(
        `insert into webhook_events (provider, provider_event_id, event_type)
         values ('clerk', $1, $2)
         on conflict (provider, provider_event_id) do nothing`,
        [event.id, event.type],
      );
      return { accepted: true };
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }
  }
}
