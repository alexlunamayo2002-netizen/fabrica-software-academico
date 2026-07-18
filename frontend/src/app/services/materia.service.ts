import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, switchMap, throwError, of } from 'rxjs';
import { Materia } from '../models/user.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MateriaService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: token ? `Bearer ${token}` : '' });
  }

  private post(query: string, variables?: object): Observable<any> {
    return this.http.post<any>(this.apiUrl, { query, variables }, { headers: this.getHeaders() });
  }

  getMaterias(): Observable<Materia[]> {
    const query = `{ materias { id codigo nombre creditos descripcion createdAt updatedAt } }`;
    return this.post(query).pipe(
      switchMap(res => {
        if (res.errors) return throwError(() => new Error(res.errors[0].message));
        return of(res.data.materias as Materia[]);
      })
    );
  }

  crearMateria(codigo: string, nombre: string, creditos: number, descripcion?: string): Observable<Materia> {
    const query = `
      mutation($codigo: String!, $nombre: String!, $creditos: Int!, $descripcion: String) {
        crearMateria(codigo: $codigo, nombre: $nombre, creditos: $creditos, descripcion: $descripcion) {
          id codigo nombre creditos descripcion
        }
      }
    `;
    return this.post(query, { codigo, nombre, creditos, descripcion }).pipe(
      switchMap(res => {
        if (res.errors) return throwError(() => new Error(res.errors[0].message));
        return of(res.data.crearMateria as Materia);
      })
    );
  }

  actualizarMateria(id: string, campos: Partial<Omit<Materia, 'id' | 'createdAt' | 'updatedAt'>>): Observable<Materia> {
    const query = `
      mutation($id: ID!, $codigo: String, $nombre: String, $creditos: Int, $descripcion: String) {
        actualizarMateria(id: $id, codigo: $codigo, nombre: $nombre, creditos: $creditos, descripcion: $descripcion) {
          id codigo nombre creditos descripcion
        }
      }
    `;
    return this.post(query, { id, ...campos }).pipe(
      switchMap(res => {
        if (res.errors) return throwError(() => new Error(res.errors[0].message));
        return of(res.data.actualizarMateria as Materia);
      })
    );
  }

  eliminarMateria(id: string): Observable<boolean> {
    const query = `mutation($id: ID!) { eliminarMateria(id: $id) }`;
    return this.post(query, { id }).pipe(
      switchMap(res => {
        if (res.errors) return throwError(() => new Error(res.errors[0].message));
        return of(res.data.eliminarMateria as boolean);
      })
    );
  }
}
