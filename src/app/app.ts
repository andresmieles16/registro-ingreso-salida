import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from './services/auth.service';
import { EdificioService } from './services/edificio.service';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrl: './app.css',
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    CommonModule, TitleCasePipe,
    MatToolbarModule, MatSidenavModule, MatListModule,
    MatIconModule, MatButtonModule, MatDividerModule,
    MatMenuModule, MatSelectModule, MatTooltipModule,
  ]
})
export class App {
  title = 'Sistema de Registro';

  constructor(
    public authService:     AuthService,
    public edificioService: EdificioService
  ) {}

  menuSuperAdmin = [
    { label: 'Gestion de Edificios', icon: 'apartment', route: '/edificios' },
  ];

  esAdminNoSuper(): boolean {
    return this.authService.isAdmin() && !this.authService.isSuperAdmin();
  }

  async logout(): Promise<void> {
    await this.authService.logout();
  }
}
