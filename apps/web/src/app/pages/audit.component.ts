import { Component } from '@angular/core';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { ApiService } from '../core/api/api.service';

@Component({
  standalone: true,
  imports: [AsyncPipe, JsonPipe],
  template: `<section class="panel"><h2>Auditoria</h2><pre>{{ audit$ | async | json }}</pre></section>`,
})
export class AuditComponent {
  audit$ = this.api.auditEvents();
  constructor(private readonly api: ApiService) {}
}
