import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { InscripcionService } from '../../services/inscripcion.service';
import { MateriaService } from '../../services/materia.service';
import { AuthService } from '../../services/auth.service';
import { Inscripcion, Materia } from '../../models/user.model';

@Component({
  selector: 'app-mis-inscripciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-inscripciones.component.html',
  styleUrls: ['./mis-inscripciones.component.scss']
})
export class MisInscripcionesComponent implements OnInit {
  misInscripciones: Inscripcion[] = [];
  todasMaterias: Materia[] = [];
  materiasDisponibles: Materia[] = [];

  loading = false;
  inscribiendoId: string | null = null;
  desinscribiendoId: string | null = null;
  confirmDesinscribir: { estudianteId: string; materiaId: string; materiaNombre: string } | null = null;
  error = '';
  successMsg = '';

  constructor(
    private inscripcionService: InscripcionService,
    private materiaService: MateriaService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarDatos();
  }

  private cargarDatos() {
    this.loading = true;
    this.materiaService.getMaterias().subscribe({
      next: materias => {
        this.todasMaterias = materias;
        this.cargarMisInscripciones();
      },
      error: err => { this.error = err.message; this.loading = false; this.cdr.detectChanges(); }
    });
  }

  cargarMisInscripciones() {
    const userId = this.user?.id;
    if (!userId) return;
    this.loading = true;
    this.inscripcionService.getPorEstudiante(userId).subscribe({
      next: inscripciones => {
        this.misInscripciones = inscripciones;
        const idsInscritas = new Set(inscripciones.map(i => i.materia.id));
        this.materiasDisponibles = this.todasMaterias.filter(m => !idsInscritas.has(m.id));
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: err => { this.error = err.message; this.loading = false; this.cdr.detectChanges(); }
    });
  }

  inscribirme(materiaId: string) {
    const userId = this.user?.id;
    if (!userId) return;
    this.inscribiendoId = materiaId;
    this.error = '';
    this.inscripcionService.inscribir(userId, materiaId).subscribe({
      next: () => {
        this.inscribiendoId = null;
        this.successMsg = 'Te has inscrito exitosamente.';
        this.cargarMisInscripciones();
        this.cdr.detectChanges();
      },
      error: err => { this.error = err.message; this.inscribiendoId = null; this.cdr.detectChanges(); }
    });
  }

  pedirConfirmar(inscripcion: Inscripcion) {
    this.confirmDesinscribir = {
      estudianteId: inscripcion.estudiante.id,
      materiaId: inscripcion.materia.id,
      materiaNombre: inscripcion.materia.nombre
    };
  }

  cancelarDesinscribir() { this.confirmDesinscribir = null; }

  desinscribirme() {
    if (!this.confirmDesinscribir) return;
    const { estudianteId, materiaId } = this.confirmDesinscribir;
    this.desinscribiendoId = materiaId;
    this.confirmDesinscribir = null;
    this.error = '';
    this.inscripcionService.desinscribir(estudianteId, materiaId).subscribe({
      next: () => {
        this.desinscribiendoId = null;
        this.successMsg = 'Te has desinscrito correctamente.';
        this.cargarMisInscripciones();
        this.cdr.detectChanges();
      },
      error: err => { this.error = err.message; this.desinscribiendoId = null; this.cdr.detectChanges(); }
    });
  }

  formatFecha(iso: string): string {
    return new Date(iso).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  get user() { return this.authService.currentUser(); }
  logout()   { this.authService.logout(); this.router.navigate(['/login']); }
  goBack()   { this.router.navigate(['/dashboard']); }
}
