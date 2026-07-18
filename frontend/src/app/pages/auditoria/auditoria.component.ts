import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuditoriaService, AuditoriaEvento } from '../../services/auditoria.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auditoria.component.html',
  styleUrls: ['./auditoria.component.scss']
})
export class AuditoriaComponent implements OnInit {
  eventos: AuditoriaEvento[] = [];
  loading = true;
  error = '';

  constructor(
    private auditoriaService: AuditoriaService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.auditoriaService.getAuditoria(100, 0).subscribe({
      next: d => { this.eventos = d; this.loading = false; this.cdr.detectChanges(); },
      error: err => { this.error = err.message; this.loading = false; this.cdr.detectChanges(); }
    });
  }

  formatFecha(iso: string): string {
    return new Date(iso).toLocaleString('es-EC', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  accionColor(accion: string): string {
    const map: Record<string, string> = {
      LOGIN: 'green', LOGOUT: 'blue',
      LOGIN_FALLIDO: 'red', REGISTRO: 'purple'
    };
    return map[accion] ?? 'gray';
  }

  get user() { return this.authService.currentUser(); }
  logout()   { this.authService.logout(); this.router.navigate(['/login']); }
  goBack()   { this.router.navigate(['/admin']); }
}
