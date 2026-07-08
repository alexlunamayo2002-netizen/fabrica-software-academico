import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, switchMap, throwError, of } from 'rxjs';
import { Inscripcion, Usuario } from '../models/user.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class InscripcionService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: token ? `Bearer ${token}` : '' });
  }

  private post(query: string, variables?: object): Observable<any> {
    return this.http.post<any>(this.apiUrl, { query, variables }, { headers: this.getHeaders() });
  }

  getInscripciones(): Observable<Inscripcion[]> {
    const query = `{
      inscripciones {
        id fechaInscripcion
        estudiante { id nombre email }
        materia { id codigo nombre creditos }
      }
    }`;
    return this.post(query).pipe(
      switchMap(res => {
        if (res.errors) return throwError(() => new Error(res.errors[0].message));
        return of(res.data.inscripciones as Inscripcion[]);
      })
    );
  }

  getPorEstudiante(estudianteId: string): Observable<Inscripcion[]> {
    const query = `query($estudianteId: ID!) {
      inscripcionesPorEstudiante(estudianteId: $estudianteId) {
        id fechaInscripcion
        estudiante { id nombre email }
        materia { id codigo nombre creditos }
      }
    }`;
    return this.post(query, { estudianteId }).pipe(
      switchMap(res => {
        if (res.errors) return throwError(() => new Error(res.errors[0].message));
        return of(res.data.inscripcionesPorEstudiante as Inscripcion[]);
      })
    );
  }

  getPorMateria(materiaId: string): Observable<Inscripcion[]> {
    const query = `query($materiaId: ID!) {
      inscripcionesPorMateria(materiaId: $materiaId) {
        id fechaInscripcion
        estudiante { id nombre email }
        materia { id codigo nombre creditos }
      }
    }`;
    return this.post(query, { materiaId }).pipe(
      switchMap(res => {
        if (res.errors) return throwError(() => new Error(res.errors[0].message));
        return of(res.data.inscripcionesPorMateria as Inscripcion[]);
      })
    );
  }

  inscribir(estudianteId: string, materiaId: string): Observable<Inscripcion> {
    const query = `mutation($estudianteId: ID!, $materiaId: ID!) {
      inscribir(estudianteId: $estudianteId, materiaId: $materiaId) {
        id fechaInscripcion
        estudiante { id nombre email }
        materia { id codigo nombre creditos }
      }
    }`;
    return this.post(query, { estudianteId, materiaId }).pipe(
      switchMap(res => {
        if (res.errors) return throwError(() => new Error(res.errors[0].message));
        return of(res.data.inscribir as Inscripcion);
      })
    );
  }

  desinscribir(estudianteId: string, materiaId: string): Observable<boolean> {
    const query = `mutation($estudianteId: ID!, $materiaId: ID!) {
      desinscribir(estudianteId: $estudianteId, materiaId: $materiaId)
    }`;
    return this.post(query, { estudianteId, materiaId }).pipe(
      switchMap(res => {
        if (res.errors) return throwError(() => new Error(res.errors[0].message));
        return of(res.data.desinscribir as boolean);
      })
    );
  }

  getUsuarios(): Observable<Usuario[]> {
    const query = `{ usuarios { id nombre email rol } }`;
    return this.post(query).pipe(
      switchMap(res => {
        if (res.errors) return throwError(() => new Error(res.errors[0].message));
        return of(res.data.usuarios as Usuario[]);
      })
    );
  }
}
