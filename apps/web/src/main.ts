import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, Routes } from '@angular/router';
import { AppComponent } from './app/app.component';
import { authGuard } from './app/core/auth/auth.guard';
import { authInterceptor } from './app/core/api/auth.interceptor';
import { LoginComponent } from './app/pages/login.component';
import { DashboardComponent } from './app/pages/dashboard.component';
import { MembersComponent } from './app/pages/members.component';
import { AuditComponent } from './app/pages/audit.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'members', component: MembersComponent, canActivate: [authGuard] },
  { path: 'audit', component: AuditComponent, canActivate: [authGuard] },
];

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes), provideHttpClient(withInterceptors([authInterceptor]))],
});
