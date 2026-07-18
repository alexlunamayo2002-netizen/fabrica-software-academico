import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, switchMap, throwError, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuditoriaEvento {
  id: string;
  accion: string;
  entidad: string;
  entidadId: number;
  detalles: string;
  ipAddress: string;
  fechaHora: string;
  usuarioId: number;
  usuarioNombre: string;
  usuarioEmail: string;
}

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: token ? `Bearer ${token}` : '' });
  }

  private post(query: string, variables?: object): Observable<any> {
    return this.http.post<any>(this.apiUrl, { query, variables }, { headers: this.getHeaders() });
  }

  getAuditoria(limit = 100, offset = 0): Observable<AuditoriaEvento[]> {
    const query = `query($limit: Int, $offset: Int) {
      auditoria(limit: $limit, offset: $offset) {
        id accion entidad entidadId detalles ipAddress fechaHora usuarioId usuarioNombre usuarioEmail
      }
    }`;
    return this.post(query, { limit, offset }).pipe(
      switchMap(res => {
        if (res.errors) return throwError(() => new Error(res.errors[0].message));
        return of(res.data.auditoria as AuditoriaEvento[]);
      })
    );
  }

  getAuditoriaPorAccion(accion: string, limit = 100): Observable<AuditoriaEvento[]> {
    const query = `query($accion: String!, $limit: Int) {
      auditoriaByAccion(accion: $accion, limit: $limit) {
        id accion entidad entidadId detalles ipAddress fechaHora usuarioId usuarioNombre usuarioEmail
      }
    }`;
    return this.post(query, { accion, limit }).pipe(
      switchMap(res => {
        if (res.errors) return throwError(() => new Error(res.errors[0].message));
        return of(res.data.auditoriaByAccion as AuditoriaEvento[]);
      })
    );
  }
}
