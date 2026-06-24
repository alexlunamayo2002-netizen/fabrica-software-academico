import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { AuthPayload, Usuario, Role } from '../models/user.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  
  // Reactive state for the current user
  currentUser = signal<Usuario | null>(null);

  constructor(private http: HttpClient) {
    this.loadUserFromToken();
  }

  private loadUserFromToken() {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    if (token && userJson) {
      try {
        this.currentUser.set(JSON.parse(userJson));
      } catch (e) {
        this.logout();
      }
    }
  }

  login(email: string, password: string): Observable<AuthPayload> {
    const query = `
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) {
          token
          usuario {
            id
            nombre
            email
            rol
            createdAt
          }
        }
      }
    `;

    return this.http.post<{data: {login: AuthPayload}}>(this.apiUrl, {
      query,
      variables: { email, password }
    }).pipe(
      map(res => {
        // If there are graphql errors, they would be handled by a generic interceptor or here.
        // For now, we assume success if data is present.
        if (!res.data || !res.data.login) {
          throw new Error('Invalid credentials or backend error');
        }
        return res.data.login;
      }),
      tap(payload => this.handleAuthSuccess(payload))
    );
  }

  registro(nombre: string, email: string, password: string, rol: Role): Observable<AuthPayload> {
    const query = `
      mutation Registro($nombre: String!, $email: String!, $password: String!, $rol: Role!) {
        registro(nombre: $nombre, email: $email, password: $password, rol: $rol) {
          token
          usuario {
            id
            nombre
            email
            rol
            createdAt
          }
        }
      }
    `;

    return this.http.post<{data: {registro: AuthPayload}}>(this.apiUrl, {
      query,
      variables: { nombre, email, password, rol }
    }).pipe(
      map(res => {
        if (!res.data || !res.data.registro) {
          throw new Error('Registration failed');
        }
        return res.data.registro;
      }),
      tap(payload => this.handleAuthSuccess(payload))
    );
  }

  private handleAuthSuccess(payload: AuthPayload) {
    localStorage.setItem('token', payload.token);
    localStorage.setItem('user', JSON.stringify(payload.usuario));
    this.currentUser.set(payload.usuario);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  getUserRole(): Role | null {
    const user = this.currentUser();
    return user ? user.rol : null;
  }
}
