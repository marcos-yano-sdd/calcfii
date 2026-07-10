import { Injectable } from '@angular/core';
import { Clerk } from '@clerk/clerk-js';
import { AppConfigService } from '../config/app-config.service';

@Injectable({ providedIn: 'root' })
export class ClerkService {
  private clerk?: Clerk;

  constructor(private readonly appConfig: AppConfigService) {}

  async client() {
    if (!this.clerk) {
      const config = await this.appConfig.load();
      if (!config.clerkPublishableKey) {
        throw new Error('Missing NG_APP_CLERK_PUBLISHABLE_KEY');
      }
      this.clerk = new Clerk(config.clerkPublishableKey);
      await this.clerk.load();
    }
    return this.clerk;
  }

  async isSignedIn() {
    const clerk = await this.client();
    return Boolean(clerk.user);
  }

  async token() {
    const clerk = await this.client();
    return clerk.session?.getToken() ?? null;
  }
}
