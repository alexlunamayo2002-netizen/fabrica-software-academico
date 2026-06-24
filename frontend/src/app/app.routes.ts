import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { 
    path: 'login', 
    loadComponent: () => import('./pages/login/login.component').then(c => c.LoginComponent) 
  },
  { 
    path: 'registro', 
    loadComponent: () => import('./pages/registro/registro.component').then(c => c.RegistroComponent) 
  },
  { 
    path: 'recuperar-password', 
    loadComponent: () => import('./pages/recuperar-password/recuperar-password.component').then(c => c.RecuperarPasswordComponent) 
  },
  { 
    path: 'dashboard', 
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(c => c.DashboardComponent),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: 'login' }
];
