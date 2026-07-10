import { Component, ElementRef, ViewChild } from '@angular/core';
import { ClerkService } from '../core/auth/clerk.service';

@Component({
  standalone: true,
  selector: 'app-login',
  template: `<section class="panel"><h2>Entrar</h2><div #mount></div></section>`,
})
export class LoginComponent {
  @ViewChild('mount', { static: true }) mount!: ElementRef<HTMLDivElement>;

  constructor(private readonly clerk: ClerkService) {}

  async ngOnInit() {
    const client = await this.clerk.client();
    client.mountSignIn(this.mount.nativeElement);
  }
}
