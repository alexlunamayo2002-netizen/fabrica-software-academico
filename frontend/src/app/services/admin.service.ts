import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, switchMap, throwError, of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Stats {
  totalUsuarios: number;
  totalMaterias: number;
  totalInscripciones: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: token ? `Bearer ${token}` : '' });
  }

  private post(query: string): Observable<any> {
    return this.http.post<any>(this.apiUrl, { query }, { headers: this.getHeaders() });
  }

  getStats(): Observable<Stats> {
    const query = `{ stats { totalUsuarios totalMaterias totalInscripciones } }`;
    return this.post(query).pipe(
      switchMap(res => {
        if (res.errors) return throwError(() => new Error(res.errors[0].message));
        return of(res.data.stats as Stats);
      })
    );
  }

  getUsuarios(): Observable<any[]> {
    const query = `{ usuarios { id nombre email rol { nombre } createdAt } }`;
    return this.post(query).pipe(
      switchMap(res => {
        if (res.errors) return throwError(() => new Error(res.errors[0].message));
        return of(res.data.usuarios);
      })
    );
  }
}
