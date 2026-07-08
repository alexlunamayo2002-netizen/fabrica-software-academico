import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AdminService, Stats } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.scss']
})
export class AdminPanelComponent implements OnInit {
  stats: Stats | null = null;
  usuarios: any[] = [];
  loading = true;
  error = '';

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    forkJoin({
      stats:    this.adminService.getStats(),
      usuarios: this.adminService.getUsuarios(),
    }).subscribe({
      next: ({ stats, usuarios }) => {
        this.stats    = stats;
        this.usuarios = usuarios;
        this.loading  = false;
      },
      error: err => { this.error = err.message; this.loading = false; }
    });
  }

  get user() { return this.authService.currentUser(); }

  logout() { this.authService.logout(); this.router.navigate(['/login']); }
  goBack()  { this.router.navigate(['/dashboard']); }

  rolColor(rol: string): string {
    const map: Record<string, string> = { ADMIN: 'red', DOCENTE: 'blue', ESTUDIANTE: 'green' };
    return map[rol?.toUpperCase()] ?? 'gray';
  }

  formatFecha(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
