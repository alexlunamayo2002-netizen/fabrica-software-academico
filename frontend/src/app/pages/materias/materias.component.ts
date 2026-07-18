import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MateriaService } from '../../services/materia.service';
import { AuthService } from '../../services/auth.service';
import { Materia, Role } from '../../models/user.model';

@Component({
  selector: 'app-materias',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './materias.component.html',
  styleUrls: ['./materias.component.scss']
})
export class MateriasComponent implements OnInit {
  materias: Materia[] = [];
  loading = false;
  error = '';
  showForm = false;
  editingId: string | null = null;
  savingForm = false;
  deleteConfirmId: string | null = null;
  form!: FormGroup;
  Role = Role;

  get canCreate() { const r = this.user?.rol; return r === Role.ADMIN || r === Role.DOCENTE; }
  get canEdit()   { const r = this.user?.rol; return r === Role.ADMIN || r === Role.DOCENTE; }
  get canDelete() { return this.user?.rol === Role.ADMIN; }

  constructor(
    private materiaService: MateriaService,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadMaterias();
  }

  private initForm(materia?: Materia) {
    this.form = this.fb.group({
      codigo:     [materia?.codigo     ?? '', [Validators.required, Validators.maxLength(20)]],
      nombre:     [materia?.nombre     ?? '', [Validators.required, Validators.maxLength(150)]],
      creditos:   [materia?.creditos   ?? 3,  [Validators.required, Validators.min(1), Validators.max(20)]],
      descripcion:[materia?.descripcion ?? '']
    });
  }

  loadMaterias() {
    this.loading = true;
    this.error = '';
    this.materiaService.getMaterias().subscribe({
      next: (data) => { this.materias = data; this.loading = false; this.cdr.detectChanges(); },
      error: (err) => { this.error = err.message; this.loading = false; this.cdr.detectChanges(); }
    });
  }

  openCreate() {
    this.editingId = null;
    this.initForm();
    this.showForm = true;
  }

  openEdit(materia: Materia) {
    this.editingId = materia.id;
    this.initForm(materia);
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.editingId = null;
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.savingForm = true;
    const { codigo, nombre, creditos, descripcion } = this.form.value;

    const op$ = this.editingId
      ? this.materiaService.actualizarMateria(this.editingId, { codigo, nombre, creditos, descripcion: descripcion || undefined })
      : this.materiaService.crearMateria(codigo, nombre, creditos, descripcion || undefined);

    op$.subscribe({
      next: () => { this.savingForm = false; this.closeForm(); this.loadMaterias(); this.cdr.detectChanges(); },
      error: (err) => { this.error = err.message; this.savingForm = false; this.cdr.detectChanges(); }
    });
  }

  confirmDelete(id: string) { this.deleteConfirmId = id; }
  cancelDelete() { this.deleteConfirmId = null; }

  delete() {
    if (!this.deleteConfirmId) return;
    const id = this.deleteConfirmId;
    this.deleteConfirmId = null;
    this.materiaService.eliminarMateria(id).subscribe({
      next: () => this.loadMaterias(),
      error: (err) => { this.error = err.message; }
    });
  }

  get user() { return this.authService.currentUser(); }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goBack() { this.router.navigate(['/dashboard']); }

  fieldError(field: string): string {
    const c = this.form.get(field);
    if (!c || !c.touched || !c.errors) return '';
    if (c.errors['required'])  return 'Este campo es obligatorio.';
    if (c.errors['maxlength']) return `Máximo ${c.errors['maxlength'].requiredLength} caracteres.`;
    if (c.errors['min'])       return `Mínimo ${c.errors['min'].min}.`;
    if (c.errors['max'])       return `Máximo ${c.errors['max'].max}.`;
    return '';
  }
}
