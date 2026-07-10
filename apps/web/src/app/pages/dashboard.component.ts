import { Component } from '@angular/core';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { ApiService } from '../core/api/api.service';

@Component({
  standalone: true,
  imports: [AsyncPipe, JsonPipe],
  template: `
    <section class="panel">
      <h2>Dashboard</h2>
      <pre>{{ me$ | async | json }}</pre>
    </section>
  `,
})
export class DashboardComponent {
  me$ = this.api.me();
  constructor(private readonly api: ApiService) {}
}
