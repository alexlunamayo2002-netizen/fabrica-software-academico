import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InscripcionService } from '../../services/inscripcion.service';
import { MateriaService } from '../../services/materia.service';
import { AuthService } from '../../services/auth.service';
import { Inscripcion, Materia, Usuario } from '../../models/user.model';

type Filtro = 'todos' | 'estudiante' | 'materia';

@Component({
  selector: 'app-inscripciones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './inscripciones.component.html',
  styleUrls: ['./inscripciones.component.scss']
})
export class InscripcionesComponent implements OnInit {
  inscripciones: Inscripcion[] = [];
  materias: Materia[] = [];
  usuarios: Usuario[] = [];

  loading = false;
  savingForm = false;
  error = '';

  filtroActivo: Filtro = 'todos';
  filtroEstudianteId = '';
  filtroMateriaId = '';

  deleteConfirm: { estudianteId: string; materiaId: string } | null = null;

  form!: FormGroup;

  constructor(
    private inscripcionService: InscripcionService,
    private materiaService: MateriaService,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      estudianteId: ['', Validators.required],
      materiaId:    ['', Validators.required]
    });
    this.loadCatalogos();
    this.loadInscripciones();
  }

  private loadCatalogos() {
    this.materiaService.getMaterias().subscribe({ next: d => { this.materias = d; this.cdr.detectChanges(); } });
    this.inscripcionService.getUsuarios().subscribe({ next: d => { this.usuarios = d; this.cdr.detectChanges(); } });
  }

  loadInscripciones() {
    this.loading = true;
    this.error = '';
    let obs$;
    if (this.filtroActivo === 'estudiante' && this.filtroEstudianteId) {
      obs$ = this.inscripcionService.getPorEstudiante(this.filtroEstudianteId);
    } else if (this.filtroActivo === 'materia' && this.filtroMateriaId) {
      obs$ = this.inscripcionService.getPorMateria(this.filtroMateriaId);
    } else {
      obs$ = this.inscripcionService.getInscripciones();
    }
    obs$.subscribe({
      next: d => { this.inscripciones = d; this.loading = false; this.cdr.detectChanges(); },
      error: err => { this.error = err.message; this.loading = false; this.cdr.detectChanges(); }
    });
  }

  setFiltro(f: Filtro) {
    this.filtroActivo = f;
    if (f === 'todos') { this.filtroEstudianteId = ''; this.filtroMateriaId = ''; this.loadInscripciones(); }
  }

  onFiltroEstudiante(id: string) {
    this.filtroEstudianteId = id;
    if (id) this.loadInscripciones();
  }

  onFiltroMateria(id: string) {
    this.filtroMateriaId = id;
    if (id) this.loadInscripciones();
  }

  inscribir() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.savingForm = true;
    const { estudianteId, materiaId } = this.form.value;
    this.inscripcionService.inscribir(estudianteId, materiaId).subscribe({
      next: () => {
        this.savingForm = false;
        this.form.reset();
        this.loadInscripciones();
        this.cdr.detectChanges();
      },
      error: err => { this.error = err.message; this.savingForm = false; this.cdr.detectChanges(); }
    });
  }

  confirmDesinscribir(estudianteId: string, materiaId: string) {
    this.deleteConfirm = { estudianteId, materiaId };
  }

  cancelDesinscribir() { this.deleteConfirm = null; }

  desinscribir() {
    if (!this.deleteConfirm) return;
    const { estudianteId, materiaId } = this.deleteConfirm;
    this.deleteConfirm = null;
    this.inscripcionService.desinscribir(estudianteId, materiaId).subscribe({
      next: () => this.loadInscripciones(),
      error: err => { this.error = err.message; }
    });
  }

  get user() { return this.authService.currentUser(); }

  logout() { this.authService.logout(); this.router.navigate(['/login']); }
  goBack()  { this.router.navigate(['/dashboard']); }

  formatFecha(iso: string): string {
    return new Date(iso).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
