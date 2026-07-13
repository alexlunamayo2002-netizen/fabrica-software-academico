import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GraphqlService } from '../../services/graphql.service';

interface EventoAuditoria {
  id: string;
  accion: string;
  entidad?: string;
  detalles?: string;
  ipAddress?: string;
  fechaHora: string;
  usuarioNombre?: string;
  usuarioEmail?: string;
}

// CA-012 · Visor de Auditoría (frontend)
// Muestra los eventos registrados por el Core Asset de Auditoría.
@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './auditoria.component.html',
  styleUrls: ['./auditoria.component.scss']
})
export class AuditoriaComponent implements OnInit {
  private gql = inject(GraphqlService);

  eventos = signal<EventoAuditoria[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);
  filtroAccion = signal<string>('');

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.error.set(null);
    const query = `
      query Auditoria($limit: Int) {
        auditoria(limit: $limit) {
          id accion entidad detalles ipAddress fechaHora usuarioNombre usuarioEmail
        }
      }`;
    this.gql.request<{ auditoria: EventoAuditoria[] }>(query, { limit: 100 }).subscribe({
      next: d => { this.eventos.set(d.auditoria); this.cargando.set(false); },
      error: err => { this.error.set(err.message); this.cargando.set(false); }
    });
  }

  eventosFiltrados(): EventoAuditoria[] {
    const filtro = this.filtroAccion();
    if (!filtro) return this.eventos();
    return this.eventos().filter(e => e.accion === filtro);
  }

  accionesUnicas(): string[] {
    return [...new Set(this.eventos().map(e => e.accion))].sort();
  }

  setFiltro(accion: string) {
    this.filtroAccion.set(this.filtroAccion() === accion ? '' : accion);
  }

  claseAccion(accion: string): string {
    if (accion.includes('FALLIDO') || accion.startsWith('ELIMINAR')) return 'danger';
    if (accion === 'LOGIN' || accion === 'REGISTRO' || accion.startsWith('CREAR')) return 'ok';
    return 'neutral';
  }
}
