import { Injectable } from '@angular/core';

export interface AppConfig {
  apiBaseUrl: string;
  clerkPublishableKey: string;
}

const fallbackConfig: AppConfig = {
  apiBaseUrl: 'http://localhost:3000',
  clerkPublishableKey: '',
};

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private configPromise?: Promise<AppConfig>;

  load(): Promise<AppConfig> {
    this.configPromise ??= fetch('/assets/app-config.json', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : fallbackConfig))
      .catch(() => fallbackConfig);
    return this.configPromise;
  }
}
