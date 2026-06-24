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
            rol {
              nombre
            }
            createdAt
          }
        }
      }
    `;

    return this.http.post<{data: {login: any}}>(this.apiUrl, {
      query,
      variables: { email, password }
    }).pipe(
      map(res => {
        if (!res.data || !res.data.login) {
          throw new Error('Invalid credentials or backend error');
        }
        
        const payload = res.data.login;
        // Transform the GraphQL response { rol: { nombre: 'ESTUDIANTE' } } into 'ESTUDIANTE'
        payload.usuario.rol = payload.usuario.rol.nombre as Role;
        
        return payload as AuthPayload;
      }),
      tap(payload => this.handleAuthSuccess(payload))
    );
  }

  registro(nombre: string, email: string, password: string, rol: Role): Observable<AuthPayload> {
    const rolId = rol === Role.ADMIN ? '1' : rol === Role.DOCENTE ? '2' : '3';
    
    const query = `
      mutation Registro($nombre: String!, $email: String!, $password: String!, $rolId: ID!) {
        registro(nombre: $nombre, email: $email, password: $password, rolId: $rolId) {
          token
          usuario {
            id
            nombre
            email
            rol {
              nombre
            }
            createdAt
          }
        }
      }
    `;

    return this.http.post<{data: {registro: any}}>(this.apiUrl, {
      query,
      variables: { nombre, email, password, rolId }
    }).pipe(
      map(res => {
        if (!res.data || !res.data.registro) {
          throw new Error('Registration failed');
        }
        
        const payload = res.data.registro;
        // Transform the GraphQL response { rol: { nombre: 'ESTUDIANTE' } } into 'ESTUDIANTE'
        payload.usuario.rol = payload.usuario.rol.nombre as Role;
        
        return payload as AuthPayload;
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
