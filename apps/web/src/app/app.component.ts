import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="shell">
      <nav>
        <h1>Calc FII</h1>
        <a routerLink="/">Dashboard</a>
        <a routerLink="/members">Membros</a>
        <a routerLink="/audit">Auditoria</a>
      </nav>
      <main><router-outlet /></main>
    </div>
  `,
})
export class AppComponent {}
