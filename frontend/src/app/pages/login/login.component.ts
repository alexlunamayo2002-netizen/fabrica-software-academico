import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Role } from '../../models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (payload) => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        // The backend throws "No implementado aún" so this will trigger
        this.errorMessage = err.message || 'Error al iniciar sesión. Por favor, verifica tus credenciales.';
        
        // TEMPORARY FOR DEMO/SPRINT 1 (since backend is not implemented):
        // We will fake a login if it's the backend error "No implementado aún"
        // Remove this when backend login is implemented
        if (err.message && err.message.includes('No implementado')) {
           // Simulate successful login
           const fakePayload = {
             token: 'fake-jwt-token',
             usuario: { id: '1', nombre: 'Test User', email: email, rol: Role.ESTUDIANTE, createdAt: new Date().toISOString() }
           };
           localStorage.setItem('token', fakePayload.token);
           localStorage.setItem('user', JSON.stringify(fakePayload.usuario));
           this.authService.currentUser.set(fakePayload.usuario);
           this.router.navigate(['/dashboard']);
        }
      }
    });
  }
}
