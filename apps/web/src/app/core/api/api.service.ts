import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AppConfigService } from '../config/app-config.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(
    private readonly http: HttpClient,
    private readonly appConfig: AppConfigService,
  ) {}

  me() {
    return from(this.appConfig.load()).pipe(switchMap((config) => this.http.get(`${config.apiBaseUrl}/v1/me`)));
  }

  members() {
    return from(this.appConfig.load()).pipe(switchMap((config) => this.http.get(`${config.apiBaseUrl}/v1/members`)));
  }

  auditEvents() {
    return from(this.appConfig.load()).pipe(
      switchMap((config) => this.http.get(`${config.apiBaseUrl}/v1/audit-events`)),
    );
  }
}
