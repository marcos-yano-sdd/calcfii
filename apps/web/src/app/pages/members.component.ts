import { Component } from '@angular/core';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { ApiService } from '../core/api/api.service';

@Component({
  standalone: true,
  imports: [AsyncPipe, JsonPipe],
  template: `<section class="panel"><h2>Membros</h2><pre>{{ members$ | async | json }}</pre></section>`,
})
export class MembersComponent {
  members$ = this.api.members();
  constructor(private readonly api: ApiService) {}
}
