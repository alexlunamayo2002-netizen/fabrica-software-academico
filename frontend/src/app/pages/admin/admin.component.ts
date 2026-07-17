import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GraphqlService } from '../../services/graphql.service';
import { MateriaService } from '../../services/materia.service';
import { InscripcionService } from '../../services/inscripcion.service';
import { AuthService } from '../../services/auth.service';
import { FeaturesService } from '../../services/features.service';

interface UsuarioAdmin {
  id: string;
  nombre: string;
  email: string;
  rol: { nombre: string };
}

// HU-S2.5 · Panel de Administración Académico (exclusivo rol ADMIN)
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  private gql = inject(GraphqlService);
  private materiaService = inject(MateriaService);
  private inscripcionService = inject(InscripcionService);
  private authService = inject(AuthService);
  private featuresService = inject(FeaturesService);

  usuarios = signal<UsuarioAdmin[]>([]);
  totalMaterias = signal(0);
  totalInscripciones = signal(0);
  error = signal<string | null>(null);

  adminNombre = () => this.authService.currentUser()?.nombre ?? 'Administrador';

  // Los módulos solo se consultan/muestran si el Core Asset está activo
  // en este producto (evita queries a campos GraphQL que no existen).
  hasMaterias(): boolean { return this.featuresService.isEnabled('CA-016_ModuloMaterias'); }
  hasInscripciones(): boolean { return this.featuresService.isEnabled('CA-017_ModuloInscripciones'); }
  hasAuditoria(): boolean { return this.featuresService.isEnabled('CA-012_ModeloAuditoria'); }

  ngOnInit() {
    this.featuresService.cargar();
    this.gql.request<{ usuarios: UsuarioAdmin[] }>(`query { usuarios { id nombre email rol { nombre } } }`)
      .subscribe({
        next: d => this.usuarios.set(d.usuarios),
        error: err => this.error.set(err.message)
      });
    // Se intenta siempre; si el módulo no está activo el backend no expone
    // el campo y la petición falla en silencio (el contador queda en 0).
    this.materiaService.listar().subscribe({ next: m => this.totalMaterias.set(m.length), error: () => {} });
    this.inscripcionService.listar().subscribe({ next: i => this.totalInscripciones.set(i.length), error: () => {} });
  }

  contarPorRol(rol: string): number {
    return this.usuarios().filter(u => u.rol?.nombre === rol).length;
  }
}
